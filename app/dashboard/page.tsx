'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { Printer, ShoppingBag, Gift, LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { btnInteractive, cn } from '@/lib/utils';
import DashboardOverview from './components/DashboardOverview';
import DashboardPrintJobs from './components/DashboardPrintJobs';
import DashboardOrders from './components/DashboardOrders';

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];
type Order = SafeDatabase['public']['Tables']['orders']['Row'];
type PointHistory = SafeDatabase['public']['Tables']['reward_points_history']['Row'];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Data lists
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointHistory[]>([]);

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'print' | 'orders'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'orders' || tab === 'print' || tab === 'overview') {
        return tab;
      }
    }
    return 'overview';
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }

        setUser(user);

        // 1. Fetch Profile reward points
        const { data: profile } = await supabase
          .from('profiles')
          .select('reward_points')
          .eq('id', user.id)
          .single();

        if (profile) {
          setRewardPoints(profile.reward_points);
        }

        // 2. Fetch Print Jobs
        const { data: jobs } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (jobs) setPrintJobs(jobs);

        // 3. Fetch Orders
        const { data: ords } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ords) setOrders(ords);

        // 4. Fetch Reward Points History
        const { data: history } = await supabase
          .from('reward_points_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (history) setPointsHistory(history);
      } catch (err) {
        console.error('Error fetching dashboard details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  // Calculate points summary for drawing standard dashboard graphs
  const earnPointsCount = pointsHistory
    .filter((h) => h.type === 'earn')
    .reduce((sum, h) => sum + h.points, 0);
  const spendPointsCount = pointsHistory
    .filter((h) => h.type === 'spend')
    .reduce((sum, h) => sum + Math.abs(h.points), 0);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      <Header>
        <button
          onClick={handleSignOut}
          className={cn(
            'p-2 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-500/10 hover:bg-red-500/5 rounded-xl flex items-center gap-1.5 text-xs font-bold mr-2',
            btnInteractive,
          )}
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </Header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        /* Main Container */
        <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {/* Left Column: Profile Card & Tabs Menu (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* User Profile Card */}
            <div className="glass-bezel-outer">
              <div className="glass-bezel-inner p-6 space-y-5 text-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto text-xl font-black text-white shadow-lg shadow-emerald-500/20">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white truncate max-w-xs">
                    {user?.email}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider mt-1.5 inline-block">
                    Thành viên Plat
                  </span>
                </div>
                <div className="border-t border-zinc-900 pt-4 flex justify-around">
                  <div className="text-center">
                    <span className="text-xs text-zinc-500 font-semibold block uppercase">
                      Điểm khả dụng
                    </span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                      {rewardPoints}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Sidebar */}
            <div className="glass-bezel-outer">
              <div className="glass-bezel-inner !p-3 flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3',
                    btnInteractive,
                    activeTab === 'overview'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30',
                  )}
                >
                  <Gift className="w-4 h-4" /> Tổng quan & Điểm
                </button>
                <button
                  onClick={() => setActiveTab('print')}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3',
                    btnInteractive,
                    activeTab === 'print'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30',
                  )}
                >
                  <Printer className="w-4 h-4" /> Lịch sử in ấn ({printJobs.length})
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3',
                    btnInteractive,
                    activeTab === 'orders'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30',
                  )}
                >
                  <ShoppingBag className="w-4 h-4" /> Đơn hàng cửa hàng ({orders.length})
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Tab View Panels (9 cols) */}
          <div className="lg:col-span-9 space-y-6">
            {/* TAB 1: OVERVIEW & POINTS GRAPH */}
            {activeTab === 'overview' && (
              <DashboardOverview
                earnPointsCount={earnPointsCount}
                spendPointsCount={spendPointsCount}
                pointsHistory={pointsHistory}
              />
            )}

            {/* TAB 2: PRINT JOBS HISTORY */}
            {activeTab === 'print' && <DashboardPrintJobs printJobs={printJobs} />}

            {/* TAB 3: ORDERS HISTORY */}
            {activeTab === 'orders' && <DashboardOrders orders={orders} />}
          </div>
        </main>
      )}

      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-500 mt-20">
        &copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.
      </footer>
    </div>
  );
}
