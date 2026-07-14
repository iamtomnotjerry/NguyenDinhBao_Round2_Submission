'use client';

import { SafeDatabase } from '@/types/database.types';
import { Gift, TrendingUp, Clock, Calendar } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from '@/lib/i18n/context';
import { easeOutExpo, fadeUp, staggerFast } from '@/lib/motion';

type RewardPoint = SafeDatabase['public']['Tables']['reward_points_history']['Row'];

interface DashboardOverviewProps {
  earnPointsCount: number;
  spendPointsCount: number;
  pointsHistory: RewardPoint[];
}

export default function DashboardOverview({
  earnPointsCount,
  spendPointsCount,
  pointsHistory,
}: DashboardOverviewProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const usedPct = earnPointsCount > 0 ? Math.round((spendPointsCount / earnPointsCount) * 100) : 0;
  const progressWidth =
    earnPointsCount > 0 ? Math.min(100, (spendPointsCount / earnPointsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerFast}
      >
        <motion.div variants={fadeUp} className="glass-bezel-outer">
          <div className="glass-bezel-inner p-5 flex items-center gap-4 h-full">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-fg font-bold block uppercase tracking-wider">
                {t.dashboard.totalEarned}
              </span>
              <span className="text-lg font-black text-fg mt-0.5 block">
                +{earnPointsCount} pts
              </span>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} className="glass-bezel-outer">
          <div className="glass-bezel-inner p-5 flex items-center gap-4 h-full">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-fg font-bold block uppercase tracking-wider">
                {t.dashboard.totalSpent}
              </span>
              <span className="text-lg font-black text-fg mt-0.5 block">
                -{spendPointsCount} pts
              </span>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} className="glass-bezel-outer">
          <div className="glass-bezel-inner p-5 flex items-center gap-4 h-full">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-fg font-bold block uppercase tracking-wider">
                {t.dashboard.activityLevel}
              </span>
              <span className="text-lg font-black text-fg mt-0.5 block">
                {t.dashboard.activityFrequent}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="glass-bezel-outer">
        <div className="glass-bezel-inner p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
              {t.dashboard.pointsAnalysis}
            </h4>
            <span className="text-xs font-bold text-emerald-400">
              {usedPct}% {t.dashboard.percentUsed}
            </span>
          </div>
          <div className="w-full bg-elevated h-3 rounded-full overflow-hidden border border-line p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              initial={reduce ? false : { width: 0 }}
              whileInView={{ width: `${progressWidth}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: easeOutExpo, delay: 0.15 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-fg font-bold uppercase tracking-wider">
            <span>
              {t.dashboard.spentLabel} ({spendPointsCount} pts)
            </span>
            <span>
              {t.dashboard.earnedLabel} ({earnPointsCount} pts)
            </span>
          </div>
        </div>
      </div>

      <div className="glass-bezel-outer">
        <div className="glass-bezel-inner p-6 space-y-4">
          <h3 className="text-sm font-bold text-fg uppercase tracking-wider">
            {t.dashboard.pointsHistory}
          </h3>
          {pointsHistory.length === 0 ? (
            <p className="text-muted-fg text-xs text-center py-6">{t.dashboard.noPointsHistory}</p>
          ) : (
            <div className="space-y-3">
              {pointsHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex justify-between items-center p-3.5 bg-elevated/40 border border-line rounded-xl text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-secondary-strong">{history.description}</p>
                    <span className="text-[10px] text-muted-fg flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />{' '}
                      {new Date(history.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-black ${
                      history.type === 'earn' ? 'text-emerald-400' : 'text-secondary'
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
  );
}
