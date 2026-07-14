'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SafeDatabase } from '@/types/database.types';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { btnInteractiveSm, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import { easeOutExpo, springSoft } from '@/lib/motion';

type Product = SafeDatabase['public']['Tables']['products']['Row'];

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartListProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
}

export default function CartList({ cart, updateQuantity, removeFromCart }: CartListProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  if (cart.length === 0) {
    return (
      <motion.div
        className="py-12 text-center text-muted-fg space-y-3"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: easeOutExpo }}
      >
        <ShoppingCart className="w-12 h-12 text-faint mx-auto" />
        <p className="text-sm font-semibold">{t.store.cartEmpty}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {cart.map((item) => (
          <motion.div
            key={item.product.id}
            layout
            initial={reduce ? false : { opacity: 0, x: 16, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: -12, height: 0 }}
            transition={{ duration: 0.28, ease: easeOutExpo }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 bg-elevated/40 border border-line rounded-xl gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-fg truncate">{item.product.name}</h4>
                <span className="text-xs text-muted-fg font-bold">
                  ${Number(item.product.price).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <motion.button
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  transition={springSoft}
                  onClick={() => updateQuantity(item.product.id, -1)}
                  className={cn(
                    'p-1 hover:bg-muted border border-edge rounded text-secondary hover:text-fg',
                    btnInteractiveSm,
                  )}
                >
                  <Minus className="w-3.5 h-3.5" />
                </motion.button>
                <motion.span
                  key={item.quantity}
                  className="text-sm font-bold w-4 text-center inline-block"
                  initial={reduce ? false : { scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={springSoft}
                >
                  {item.quantity}
                </motion.span>
                <motion.button
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  transition={springSoft}
                  onClick={() => updateQuantity(item.product.id, 1)}
                  className={cn(
                    'p-1 hover:bg-muted border border-edge rounded text-secondary hover:text-fg',
                    btnInteractiveSm,
                  )}
                  disabled={item.quantity >= item.product.stock}
                >
                  <Plus className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  onClick={() => removeFromCart(item.product.id)}
                  className={cn(
                    'p-1 hover:bg-red-500/10 text-muted-fg hover:text-red-400 ml-1',
                    btnInteractiveSm,
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
