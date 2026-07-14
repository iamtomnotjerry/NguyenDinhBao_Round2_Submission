'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import {
  Printer,
  ShoppingBag,
  Gift,
  LogOut,
  RefreshCw,
  Clock,
  FileText,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
          className="p-2 text-zinc-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/10 hover:bg-red-500/5 rounded-xl flex items-center gap-1.5 text-xs font-bold mr-2"
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
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer active:scale-[0.98] ${
                    activeTab === 'overview'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                >
                  <Gift className="w-4 h-4" /> Tổng quan & Điểm
                </button>
                <button
                  onClick={() => setActiveTab('print')}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer active:scale-[0.98] ${
                    activeTab === 'print'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                >
                  <Printer className="w-4 h-4" /> Lịch sử in ấn ({printJobs.length})
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer active:scale-[0.98] ${
                    activeTab === 'orders'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
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
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stats block 1 */}
                  <div className="glass-bezel-outer">
                    <div className="glass-bezel-inner p-5 flex items-center gap-4 h-full">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                        <Gift className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
                          Tổng điểm đã tích lũy
                        </span>
                        <span className="text-lg font-black text-white mt-0.5 block">
                          +{earnPointsCount} pts
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Stats block 2 */}
                  <div className="glass-bezel-outer">
                    <div className="glass-bezel-inner p-5 flex items-center gap-4 h-full">
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
                          Điểm thưởng đã tiêu dùng
                        </span>
                        <span className="text-lg font-black text-white mt-0.5 block">
                          -{spendPointsCount} pts
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Stats block 3 */}
                  <div className="glass-bezel-outer">
                    <div className="glass-bezel-inner p-5 flex items-center gap-4 h-full">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
                          Mức độ hoạt động
                        </span>
                        <span className="text-lg font-black text-white mt-0.5 block">
                          Thường xuyên
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Points Analysis Breakdown */}
                <div className="glass-bezel-outer">
                  <div className="glass-bezel-inner p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Phân tích sử dụng điểm thưởng
                      </h4>
                      <span className="text-xs font-bold text-emerald-400">
                        {earnPointsCount > 0
                          ? Math.round((spendPointsCount / earnPointsCount) * 100)
                          : 0}
                        % đã dùng
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-900 p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                        style={{
                          width: `${earnPointsCount > 0 ? Math.min(100, (spendPointsCount / earnPointsCount) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <span>Đã tiêu dùng ({spendPointsCount} pts)</span>
                      <span>Tổng tích luỹ ({earnPointsCount} pts)</span>
                    </div>
                  </div>
                </div>

                {/* Points History Lists */}
                <div className="glass-bezel-outer">
                  <div className="glass-bezel-inner p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Lịch sử giao dịch điểm thưởng
                    </h3>
                    {pointsHistory.length === 0 ? (
                      <p className="text-zinc-500 text-xs text-center py-6">
                        Bạn chưa có giao dịch điểm thưởng nào.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {pointsHistory.map((history) => (
                          <div
                            key={history.id}
                            className="flex justify-between items-center p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-xl text-xs"
                          >
                            <div className="space-y-1">
                              <p className="font-bold text-zinc-200">{history.description}</p>
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />{' '}
                                {new Date(history.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <span
                              className={`text-sm font-black ${
                                history.type === 'earn' ? 'text-emerald-400' : 'text-zinc-400'
                              }`}
                            >
                              {history.type === 'earn' ? '+' : '-'}
                              {Math.abs(history.points)} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRINT JOBS HISTORY */}
            {activeTab === 'print' && (
              <div className="glass-bezel-outer animate-fade-in">
                <div className="glass-bezel-inner p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Hồ sơ in ấn từ xa
                  </h3>
                  {printJobs.length === 0 ? (
                    <p className="text-zinc-500 text-xs text-center py-6">
                      Bạn chưa gửi lệnh in ấn nào.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {printJobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-3"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2 text-xs">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-400" />
                              <span className="font-bold text-white truncate max-w-xs">
                                {job.file_name}
                              </span>
                            </div>
                            <span
                              className={`font-semibold py-0.5 px-2 rounded-full scale-90 border font-mono ${
                                job.status === 'completed'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : job.status === 'failed'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse'
                              }`}
                            >
                              {job.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-zinc-500">
                            <div>
                              <span>Khổ giấy / Đóng gáy:</span>
                              <p className="text-zinc-300 mt-0.5 capitalize">
                                {job.config_paper_size} • {job.config_binding}
                              </p>
                            </div>
                            <div>
                              <span>Trang / Bản in:</span>
                              <p className="text-zinc-300 mt-0.5">
                                {job.total_pages} trang • {job.config_copies || 1} bản
                              </p>
                            </div>
                            <div>
                              <span>Giá trị in:</span>
                              <p className="text-zinc-300 mt-0.5 text-white font-bold">
                                ${Number(job.cost).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span>Thời gian in:</span>
                              <p className="text-zinc-300 mt-0.5">
                                {new Date(job.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ORDERS HISTORY */}
            {activeTab === 'orders' && (
              <div className="glass-bezel-outer animate-fade-in">
                <div className="glass-bezel-inner p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Đơn mua hàng gian hàng
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-zinc-500 text-xs text-center py-6">
                      Bạn chưa đặt mua đơn hàng nào.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-3"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-400 font-mono">
                                Đơn #{order.id.slice(0, 8)}
                              </span>
                            </div>
                            <span
                              className={`font-semibold py-0.5 px-2 rounded-full scale-90 border font-mono ${
                                order.status === 'paid'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : order.status === 'failed'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-zinc-500">
                            <div>
                              <span>Nhận hàng / Giao:</span>
                              <p className="text-zinc-300 mt-0.5 capitalize">
                                {order.delivery_type}
                              </p>
                            </div>
                            <div>
                              <span>Điểm tích / Dùng:</span>
                              <p className="text-zinc-300 mt-0.5">
                                +{order.points_earned} earn / -{order.points_used} used
                              </p>
                            </div>
                            <div>
                              <span>Tổng thanh toán:</span>
                              <p className="text-zinc-300 mt-0.5 text-white font-bold">
                                ${Number(order.total_amount).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span>Thời gian đặt:</span>
                              <p className="text-zinc-300 mt-0.5">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
