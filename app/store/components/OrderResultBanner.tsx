'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import { springSoft } from '@/lib/motion';

interface OrderResultBannerProps {
  orderResult: { success: boolean; message: string; orderId?: string };
  onDismiss: () => void;
}

export default function OrderResultBanner({ orderResult, onDismiss }: OrderResultBannerProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn(
        'p-5 rounded-2xl border text-center space-y-3',
        orderResult.success
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400',
      )}
      initial={reduce ? false : { opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={springSoft}
    >
      {orderResult.success ? (
        <>
          <motion.div
            initial={reduce ? false : { scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ ...springSoft, delay: 0.05 }}
          >
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400" />
          </motion.div>
          <h4 className="font-bold text-emerald-400">{t.store.orderSuccess}</h4>
          <p className="text-xs text-secondary">{orderResult.message}</p>
          {orderResult.orderId && (
            <p className="text-[10px] font-mono bg-elevated py-1 rounded text-muted-fg">
              ID: {orderResult.orderId}
            </p>
          )}
        </>
      ) : (
        <>
          <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
          <h4 className="font-bold text-red-400">{t.store.orderFailed}</h4>
          <p className="text-xs text-secondary">{orderResult.message}</p>
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
        {t.store.backToCart}
      </button>
    </motion.div>
  );
}
