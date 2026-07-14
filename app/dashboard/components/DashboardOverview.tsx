'use client';

import { SafeDatabase } from '@/types/database.types';
import { Gift, TrendingUp, Clock, Calendar } from 'lucide-react';

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
  return (
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
              <span className="text-lg font-black text-white mt-0.5 block">Thường xuyên</span>
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
              {earnPointsCount > 0 ? Math.round((spendPointsCount / earnPointsCount) * 100) : 0}% đã
              dùng
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
  );
}
