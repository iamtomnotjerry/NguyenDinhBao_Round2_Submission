'use client';

import { User as SupabaseUser } from '@supabase/supabase-js';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { btnInteractive, cn } from '@/lib/utils';
import CartList, { type CartItem } from './CartList';
import CheckoutForm from './CheckoutForm';
import OrderResultBanner from './OrderResultBanner';
import { useLocale } from '@/lib/i18n/context';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  user: SupabaseUser | null;
  rewardPoints: number;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  deliveryType: 'pickup' | 'delivery';
  setDeliveryType: (type: 'pickup' | 'delivery') => void;
  address: string;
  setAddress: (addr: string) => void;
  name: string;
  setName: (name: string) => void;
  usePoints: boolean;
  setUsePoints: (use: boolean) => void;
  cardNumber: string;
  setCardNumber: (num: string) => void;
  expiry: string;
  setExpiry: (exp: string) => void;
  cvv: string;
  setCvv: (cvv: string) => void;
  submitting: boolean;
  orderResult: { success: boolean; message: string; orderId?: string } | null;
  setOrderResult: (res: { success: boolean; message: string; orderId?: string } | null) => void;
  handleSelectSimCard: (type: string) => void;
  subtotal: number;
  discount: number;
  pointsUsed: number;
  total: number;
  pointsEarned: number;
  handleCheckoutSubmit: (e: React.FormEvent) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  user,
  rewardPoints,
  updateQuantity,
  removeFromCart,
  deliveryType,
  setDeliveryType,
  address,
  setAddress,
  name,
  setName,
  usePoints,
  setUsePoints,
  cardNumber,
  setCardNumber,
  expiry,
  setExpiry,
  cvv,
  setCvv,
  submitting,
  orderResult,
  setOrderResult,
  handleSelectSimCard,
  subtotal,
  discount,
  pointsUsed,
  total,
  pointsEarned,
  handleCheckoutSubmit,
}: CartDrawerProps) {
  const { t } = useLocale();
  if (!isOpen) return null;

  return (
    <div className="lg:col-span-5 space-y-6">
      <div className="glass-bezel-outer">
        <div className="glass-bezel-inner p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" /> {t.store.cart} ({cart.length})
            </h3>
            <button
              type="button"
              onClick={onClose}
              className={cn('text-xs text-zinc-500 hover:text-zinc-300 font-bold', btnInteractive)}
            >
              {t.store.closeCart}
            </button>
          </div>

          {cart.length === 0 ? (
            <CartList cart={cart} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />
          ) : (
            <div className="space-y-6">
              <CartList
                cart={cart}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
              />

              <div className="mt-8 pt-6 border-t border-zinc-900 space-y-6">
                {!user ? (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center text-sm">
                    <p className="text-zinc-400 mb-3">{t.store.loginToPay}</p>
                    <Link
                      href="/auth"
                      className={cn(
                        'inline-block py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold',
                        btnInteractive,
                      )}
                    >
                      {t.store.loginNow}
                    </Link>
                  </div>
                ) : orderResult ? (
                  <OrderResultBanner
                    orderResult={orderResult}
                    onDismiss={() => setOrderResult(null)}
                  />
                ) : (
                  <CheckoutForm
                    cart={cart}
                    rewardPoints={rewardPoints}
                    deliveryType={deliveryType}
                    setDeliveryType={setDeliveryType}
                    address={address}
                    setAddress={setAddress}
                    name={name}
                    setName={setName}
                    usePoints={usePoints}
                    setUsePoints={setUsePoints}
                    cardNumber={cardNumber}
                    setCardNumber={setCardNumber}
                    expiry={expiry}
                    setExpiry={setExpiry}
                    cvv={cvv}
                    setCvv={setCvv}
                    submitting={submitting}
                    handleSelectSimCard={handleSelectSimCard}
                    subtotal={subtotal}
                    discount={discount}
                    pointsUsed={pointsUsed}
                    total={total}
                    pointsEarned={pointsEarned}
                    handleCheckoutSubmit={handleCheckoutSubmit}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
