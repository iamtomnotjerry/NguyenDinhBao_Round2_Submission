'use client';

import { useEffect, useState } from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { springSoft } from '@/lib/motion';
import PageReveal from '@/components/PageReveal';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { PageShell } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { HeaderSlot } from '@/components/HeaderSlot';
import AppFooter from '@/components/AppFooter';
import { Printer, ShoppingBag, Gift, LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn, hoverIdle } from '@/lib/utils';
import DashboardOverview from './components/DashboardOverview';
import DashboardPrintJobs from './components/DashboardPrintJobs';
import DashboardOrders from './components/DashboardOrders';
import { useLocale } from '@/lib/i18n/context';
import { useAuthUser } from '@/lib/auth/user-context';

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];
type Order = SafeDatabase['public']['Tables']['orders']['Row'];
type PointHistory = SafeDatabase['public']['Tables']['reward_points_history']['Row'];

const tabParser = parseAsStringLiteral(['overview', 'print', 'orders'] as const).withDefault(
  'overview',
);

export interface DashboardClientProps {
  initialUserId: string;
  initialEmail: string | null;
  initialRewardPoints: number;
  initialPrintJobs: PrintJob[];
  initialOrders: Order[];
  initialPointsHistory: PointHistory[];
}

export default function DashboardClient({
  initialUserId,
  initialEmail,
  initialRewardPoints,
  initialPrintJobs,
  initialOrders,
  initialPointsHistory,
}: DashboardClientProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const rewardPoints = initialRewardPoints;
  const printJobs = initialPrintJobs;
  const orders = initialOrders;
  const pointsHistory = initialPointsHistory;

  const [activeTab, setActiveTab] = useQueryState('tab', tabParser);
  const { refreshUser } = useAuthUser();

  // Live updates for this user's jobs/orders
  useEffect(() => {
    const channel = supabase
      .channel(`dashboard-${initialUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_jobs',
          filter: `user_id=eq.${initialUserId}`,
        },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${initialUserId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [initialUserId, router]);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 600);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    await refreshUser();
    router.push('/auth');
    router.refresh();
  };

  const earnPointsCount = pointsHistory
    .filter((h) => h.type === 'earn')
    .reduce((sum, h) => sum + h.points, 0);
  const spendPointsCount = pointsHistory
    .filter((h) => h.type === 'spend')
    .reduce((sum, h) => sum + Math.abs(h.points), 0);

  return (
    <PageShell className="selection:text-fg">
      <HeaderSlot>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full text-muted-fg"
            aria-label={t.dashboard.refresh}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="text-muted-fg hover:text-red-400 hover:border-red-500/10 hover:bg-red-500/5 rounded-full"
          >
            <LogOut className="w-4 h-4" />{' '}
            <span className="hidden sm:inline">{t.dashboard.signOut}</span>
          </Button>
        </div>
      </HeaderSlot>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <div className="lg:col-span-3 space-y-6">
          <PageReveal>
            <div className="glass-bezel-outer">
              <div className="glass-bezel-inner p-6 space-y-5 text-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto text-xl font-black text-on-brand shadow-lg shadow-emerald-500/20">
                  {initialEmail?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg truncate max-w-xs">{initialEmail}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted border border-edge text-secondary font-bold uppercase tracking-wider mt-1.5 inline-block">
                    {t.dashboard.member}
                  </span>
                </div>
                <div className="border-t border-line pt-4 flex justify-around">
                  <div className="text-center">
                    <span className="text-xs text-muted-fg font-semibold block uppercase">
                      {t.dashboard.pointsAvailable}
                    </span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                      {rewardPoints}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </PageReveal>

          <PageReveal delay={0.08}>
            <div className="glass-bezel-outer">
              <div className="glass-bezel-inner !p-3 flex flex-col gap-1" role="tablist">
                {(
                  [
                    { id: 'overview' as const, icon: Gift, label: t.dashboard.overview },
                    {
                      id: 'print' as const,
                      icon: Printer,
                      label: `${t.dashboard.printHistory} (${printJobs.length})`,
                    },
                    {
                      id: 'orders' as const,
                      icon: ShoppingBag,
                      label: `${t.dashboard.orderHistory} (${orders.length})`,
                    },
                  ] as const
                ).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => void setActiveTab(id)}
                    className={cn(
                      'relative w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3',
                      activeTab === id ? 'text-black' : cn('text-muted-fg', hoverIdle),
                    )}
                  >
                    {activeTab === id && (
                      <motion.span
                        layoutId="dashboard-tab"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/10"
                        transition={reduce ? { duration: 0 } : springSoft}
                      />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />{' '}
                    <span className="relative z-10">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </PageReveal>
        </div>

        <div className="lg:col-span-9 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                role="tabpanel"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={reduce ? { duration: 0 } : springSoft}
              >
                <DashboardOverview
                  earnPointsCount={earnPointsCount}
                  spendPointsCount={spendPointsCount}
                  pointsHistory={pointsHistory}
                />
              </motion.div>
            )}

            {activeTab === 'print' && (
              <motion.div
                key="print"
                role="tabpanel"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={reduce ? { duration: 0 } : springSoft}
              >
                <DashboardPrintJobs printJobs={printJobs} />
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                role="tabpanel"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={reduce ? { duration: 0 } : springSoft}
              >
                <DashboardOrders orders={orders} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      <AppFooter className="mt-20" />
    </PageShell>
  );
}
