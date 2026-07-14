'use client';

import { SafeDatabase } from '@/types/database.types';

type Order = SafeDatabase['public']['Tables']['orders']['Row'];

interface DashboardOrdersProps {
  orders: Order[];
}

export default function DashboardOrders({ orders }: DashboardOrdersProps) {
  return (
    <div className="glass-bezel-outer animate-fade-in">
      <div className="glass-bezel-inner p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Đơn mua hàng gian hàng
        </h3>
        {orders.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-6">Bạn chưa đặt mua đơn hàng nào.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 font-mono">Đơn #{order.id.slice(0, 8)}</span>
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
                    <p className="text-zinc-300 mt-0.5 capitalize">{order.delivery_type}</p>
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
  );
}
