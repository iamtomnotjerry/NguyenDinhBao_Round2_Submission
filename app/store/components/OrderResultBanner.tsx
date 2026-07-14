'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';
import { btnInteractive, cn } from '@/lib/utils';

interface OrderResultBannerProps {
  orderResult: { success: boolean; message: string; orderId?: string };
  onDismiss: () => void;
}

export default function OrderResultBanner({ orderResult, onDismiss }: OrderResultBannerProps) {
  return (
    <div
      className={`p-5 rounded-2xl border text-center space-y-3 ${
        orderResult.success
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}
    >
      {orderResult.success ? (
        <>
          <CheckCircle className="w-8 h-8 mx-auto text-emerald-400" />
          <h4 className="font-bold text-emerald-400">Đặt hàng thành công!</h4>
          <p className="text-xs text-zinc-400">{orderResult.message}</p>
          {orderResult.orderId && (
            <p className="text-[10px] font-mono bg-zinc-950 py-1 rounded text-zinc-500">
              ID: {orderResult.orderId}
            </p>
          )}
        </>
      ) : (
        <>
          <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
          <h4 className="font-bold text-red-400">Giao dịch thất bại!</h4>
          <p className="text-xs text-zinc-400">{orderResult.message}</p>
        </>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'text-xs font-bold text-emerald-400 hover:text-emerald-300 underline pt-2 block mx-auto',
          btnInteractive,
        )}
      >
        Quay lại giỏ hàng
      </button>
    </div>
  );
}
