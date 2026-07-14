import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { SafeDatabase } from '@/types/database.types';
import DashboardClient from './DashboardClient';
import { pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('dashboard');

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];
type Order = SafeDatabase['public']['Tables']['orders']['Row'];
type PointHistory = SafeDatabase['public']['Tables']['reward_points_history']['Row'];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const [{ data: profile }, { data: jobs }, { data: ords }, { data: history }] = await Promise.all([
    supabase.from('profiles').select('reward_points').eq('id', user.id).single(),
    supabase
      .from('print_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reward_points_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <DashboardClient
      initialUserId={user.id}
      initialEmail={user.email ?? null}
      initialRewardPoints={profile?.reward_points ?? 0}
      initialPrintJobs={(jobs as PrintJob[]) ?? []}
      initialOrders={(ords as Order[]) ?? []}
      initialPointsHistory={(history as PointHistory[]) ?? []}
    />
  );
}
