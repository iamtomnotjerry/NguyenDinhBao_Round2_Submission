'use client';

import { SafeDatabase } from '@/types/database.types';
import { ShoppingBag } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import EmptyState from '@/components/EmptyState';

type Order = SafeDatabase['public']['Tables']['orders']['Row'];

interface DashboardOrdersProps {
  orders: Order[];
}

export default function DashboardOrders({ orders }: DashboardOrdersProps) {
  const { t } = useLocale();

  const statusLabel = (status: string) => {
    const map = t.dashboard.orderStatus as Record<string, string>;
    return map[status] || status;
  };

  return (
    <div className="glass-bezel-outer animate-fade-in">
      <div className="glass-bezel-inner p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          {t.dashboard.storeOrdersTitle}
        </h3>
        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={t.dashboard.noOrders}
            actionHref="/store"
            actionLabel={t.dashboard.noOrdersCta}
          />
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
                      {t.dashboard.orderLabel} #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  <span
                    className={`font-semibold py-0.5 px-2.5 rounded-full border text-[10px] uppercase tracking-wide ${
                      order.status === 'paid'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : order.status === 'failed'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-zinc-500">
                  <div>
                    <span>{t.dashboard.deliveryLabel}:</span>
                    <p className="text-zinc-300 mt-0.5 capitalize">{order.delivery_type}</p>
                  </div>
                  <div>
                    <span>{t.dashboard.pointsEarnUse}:</span>
                    <p className="text-zinc-300 mt-0.5">
                      +{order.points_earned} / -{order.points_used}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.totalPaid}:</span>
                    <p className="text-zinc-300 mt-0.5 text-white font-bold">
                      ${Number(order.total_amount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.orderTime}:</span>
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
  );
}
