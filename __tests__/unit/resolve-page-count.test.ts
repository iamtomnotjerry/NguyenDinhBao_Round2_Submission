/**
 * Clamp behaviour when the admin client is unavailable — the server must
 * never accept an unbounded / malformed client page count.
 * (The real PDF-parsing path is covered by integration/manual testing.)
 */
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => null,
}));

import { resolvePrintPageCount } from '@/lib/print/resolve-page-count';

describe('resolvePrintPageCount (no admin client)', () => {
  it('clamps the client claim into [1, 2000]', async () => {
    await expect(
      resolvePrintPageCount({ filePath: 'u/file.pdf', clientTotalPages: 0 }),
    ).resolves.toMatchObject({ pages: 1, source: 'client' });

    await expect(
      resolvePrintPageCount({ filePath: 'u/file.pdf', clientTotalPages: 999_999 }),
    ).resolves.toMatchObject({ pages: 2000 });

    await expect(
      resolvePrintPageCount({ filePath: 'u/file.pdf', clientTotalPages: -5 }),
    ).resolves.toMatchObject({ pages: 1 });
  });

  it('floors fractional claims', async () => {
    await expect(
      resolvePrintPageCount({ filePath: 'u/file.pdf', clientTotalPages: 12.9 }),
    ).resolves.toMatchObject({ pages: 12 });
  });

  it('ignores NaN and defaults to 1', async () => {
    await expect(
      resolvePrintPageCount({
        filePath: 'u/file.pdf',
        clientTotalPages: Number('not-a-number'),
      }),
    ).resolves.toMatchObject({ pages: 1 });
  });

  it('flags the missing service role in the warning', async () => {
    const result = await resolvePrintPageCount({ filePath: 'u/x.pdf', clientTotalPages: 3 });
    expect(result.warning).toContain('SERVICE_ROLE');
  });
});
