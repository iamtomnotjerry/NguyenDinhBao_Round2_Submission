/**
 * Live security tests against the Supabase project in .env.local.
 * Verifies the three invariants the audit flagged as money-path critical:
 *
 *   1. RLS — user B cannot read user A's print_jobs / orders (IDOR).
 *   2. Money RPCs (rollback_failed_order, ...) reject non-service_role JWTs.
 *   3. create_order_with_stock_check idempotency is scoped per user (v9):
 *      replay returns the same order; a DIFFERENT user reusing the key
 *      must NOT receive (or roll back) the victim's order.
 *
 * Skipped automatically when SUPABASE_SERVICE_ROLE_KEY is absent (CI without
 * secrets). Creates two throwaway users + one product; cleans up in afterAll.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { SafeDatabase } from '@/types/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasEnv = Boolean(url && anonKey && serviceKey);
const describeLive = hasEnv ? describe : describe.skip;

type Db = SupabaseClient<SafeDatabase>;

function anonClient(): Db {
  return createClient<SafeDatabase>(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describeLive('Supabase live security invariants', () => {
  const admin = hasEnv
    ? createClient<SafeDatabase>(url!, serviceKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : (null as unknown as Db);

  const password = `Tt1!${randomUUID()}`;
  let userAId = '';
  let userBId = '';
  let clientA: Db;
  let clientB: Db;
  let productId = '';
  const createdOrderIds: string[] = [];
  let printJobId = '';

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      admin.auth.admin.createUser({
        email: `test-a-${randomUUID()}@example.com`,
        password,
        email_confirm: true,
      }),
      admin.auth.admin.createUser({
        email: `test-b-${randomUUID()}@example.com`,
        password,
        email_confirm: true,
      }),
    ]);
    if (a.error || b.error) throw a.error ?? b.error;
    userAId = a.data.user!.id;
    userBId = b.data.user!.id;

    clientA = anonClient();
    clientB = anonClient();
    const [sA, sB] = await Promise.all([
      clientA.auth.signInWithPassword({ email: a.data.user!.email!, password }),
      clientB.auth.signInWithPassword({ email: b.data.user!.email!, password }),
    ]);
    if (sA.error || sB.error) throw sA.error ?? sB.error;

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({
        name: `__test_product_${randomUUID()}`,
        price: 10,
        stock: 50,
        description: 'integration test fixture',
      })
      .select()
      .single();
    if (productError) throw productError;
    productId = product.id;
  });

  afterAll(async () => {
    if (!hasEnv) return;
    // Best-effort cleanup — order matters for FKs
    if (createdOrderIds.length > 0) {
      await admin.from('order_items').delete().in('order_id', createdOrderIds);
      await admin.from('orders').delete().in('id', createdOrderIds);
    }
    if (printJobId) await admin.from('print_jobs').delete().eq('id', printJobId);
    if (productId) await admin.from('products').delete().eq('id', productId);
    for (const id of [userAId, userBId]) {
      if (id) await admin.auth.admin.deleteUser(id);
    }
  });

  it('RLS: user B cannot read user A print_jobs (IDOR)', async () => {
    const { data: job, error: insertError } = await clientA
      .from('print_jobs')
      .insert({
        user_id: userAId,
        file_name: 'secret.pdf',
        file_path: `${userAId}/secret.pdf`,
        config_color: 'bw',
        config_copies: 1,
        config_paper_size: 'a4',
        config_binding: 'none',
        total_pages: 1,
        status: 'pending',
        cost: 0.11,
        printer_location: 'store_a',
      })
      .select()
      .single();
    expect(insertError).toBeNull();
    printJobId = job!.id;

    // Owner sees it
    const own = await clientA.from('print_jobs').select('id').eq('id', printJobId);
    expect(own.data).toHaveLength(1);

    // Other user sees nothing — RLS filters, no error leak
    const cross = await clientB.from('print_jobs').select('id').eq('id', printJobId);
    expect(cross.error).toBeNull();
    expect(cross.data).toHaveLength(0);
  });

  it('money RPC rollback_failed_order rejects authenticated (non service_role) callers', async () => {
    const { error } = await clientB.rpc('rollback_failed_order', {
      p_order_id: randomUUID(),
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/forbidden|permission|denied/i);
  });

  it('create_order_with_stock_check rejects ordering on behalf of another user', async () => {
    const { error } = await clientB.rpc('create_order_with_stock_check', {
      p_user_id: userAId, // spoofed
      p_total_amount: 10,
      p_discount_amount: 0,
      p_points_used: 0,
      p_points_earned: 0,
      p_delivery_type: 'pickup',
      p_idempotency_key: randomUUID(),
      p_items: [{ product_id: productId, quantity: 1 }],
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/forbidden/i);
  });

  it('idempotency: same user + same key replays the same order and deducts stock once', async () => {
    const key = randomUUID();
    const args = {
      p_user_id: userAId,
      p_total_amount: 10,
      p_discount_amount: 0,
      p_points_used: 0,
      p_points_earned: 0,
      p_delivery_type: 'pickup',
      p_idempotency_key: key,
      p_items: [{ product_id: productId, quantity: 2 }],
    };

    const first = await clientA.rpc('create_order_with_stock_check', args);
    expect(first.error).toBeNull();
    const orderId = first.data as string;
    createdOrderIds.push(orderId);

    const replay = await clientA.rpc('create_order_with_stock_check', args);
    expect(replay.error).toBeNull();
    expect(replay.data).toBe(orderId);

    const { data: product } = await admin
      .from('products')
      .select('stock')
      .eq('id', productId)
      .single();
    expect(product!.stock).toBe(48); // 50 − 2, deducted exactly once
  });

  it('idempotency v9: a different user reusing the key gets an error, never the victim order', async () => {
    const key = randomUUID();
    const argsFor = (userId: string) => ({
      p_user_id: userId,
      p_total_amount: 10,
      p_discount_amount: 0,
      p_points_used: 0,
      p_points_earned: 0,
      p_delivery_type: 'pickup',
      p_idempotency_key: key,
      p_items: [{ product_id: productId, quantity: 1 }],
    });

    const victim = await clientA.rpc('create_order_with_stock_check', argsFor(userAId));
    expect(victim.error).toBeNull();
    createdOrderIds.push(victim.data as string);

    const probe = await clientB.rpc('create_order_with_stock_check', argsFor(userBId));
    expect(probe.error).not.toBeNull();
    expect(probe.error!.message).toMatch(/idempotency key conflict/i);
    expect(probe.data).toBeNull();
  });
});
