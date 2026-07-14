'use client';

import { SafeDatabase } from '@/types/database.types';
import { ShoppingBag } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from '@/lib/i18n/context';
import EmptyState from '@/components/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { easeOutExpo, fadeUp } from '@/lib/motion';

type Order = SafeDatabase['public']['Tables']['orders']['Row'];

interface DashboardOrdersProps {
  orders: Order[];
}

export default function DashboardOrders({ orders }: DashboardOrdersProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  const statusLabel = (status: string) => {
    const map = t.dashboard.orderStatus as Record<string, string>;
    return map[status] || status;
  };

  return (
    <motion.div
      className="glass-bezel-outer"
      initial={reduce ? false : fadeUp.hidden}
      animate={fadeUp.show}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      <div className="glass-bezel-inner p-6 space-y-4">
        <h3 className="text-sm font-bold text-fg uppercase tracking-wider">
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
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, ease: easeOutExpo, delay: index * 0.04 }}
                className="p-4 bg-elevated/40 border border-line rounded-2xl space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-line pb-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-secondary font-mono">
                      {t.dashboard.orderLabel} #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  <Badge
                    tone={
                      order.status === 'paid'
                        ? 'success'
                        : order.status === 'failed'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {statusLabel(order.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-muted-fg">
                  <div>
                    <span>{t.dashboard.deliveryLabel}:</span>
                    <p className="text-secondary-strong mt-0.5 capitalize">{order.delivery_type}</p>
                  </div>
                  <div>
                    <span>{t.dashboard.pointsEarnUse}:</span>
                    <p className="text-secondary-strong mt-0.5">
                      +{order.points_earned} / -{order.points_used}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.totalPaid}:</span>
                    <p className="text-secondary-strong mt-0.5 text-fg font-bold">
                      ${Number(order.total_amount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.orderTime}:</span>
                    <p className="text-secondary-strong mt-0.5">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
