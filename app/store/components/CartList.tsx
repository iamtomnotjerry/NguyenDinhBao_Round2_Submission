'use client';

import { SafeDatabase } from '@/types/database.types';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { btnInteractive, btnInteractiveSm, cn } from '@/lib/utils';

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
  if (cart.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-500 space-y-3">
        <ShoppingCart className="w-12 h-12 text-zinc-800 mx-auto" />
        <p className="text-sm font-semibold">Giỏ hàng của bạn đang trống.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
      {cart.map((item) => (
        <div
          key={item.product.id}
          className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl gap-4"
        >
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{item.product.name}</h4>
            <span className="text-xs text-zinc-500 font-bold">
              ${Number(item.product.price).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => updateQuantity(item.product.id, -1)}
              className={cn(
                'p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white',
                btnInteractiveSm,
              )}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.product.id, 1)}
              className={cn(
                'p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white',
                btnInteractiveSm,
              )}
              disabled={item.quantity >= item.product.stock}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removeFromCart(item.product.id)}
              className={cn(
                'p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 ml-1',
                btnInteractiveSm,
              )}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
