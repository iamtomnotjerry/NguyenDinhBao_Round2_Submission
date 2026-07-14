'use client';

import { User as SupabaseUser } from '@supabase/supabase-js';
import Link from 'next/link';
import { ShoppingCart, X } from 'lucide-react';
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
  savedCards?: { id: string; card_brand: string; last4: string; card_token: string }[];
  selectedTokenId?: string | null;
  setSelectedTokenId?: (id: string | null) => void;
  saveCard?: boolean;
  setSaveCard?: (v: boolean) => void;
}

export default function CartDrawer(props: CartDrawerProps) {
  const { isOpen, onClose } = props;
  const { t } = useLocale();
  if (!isOpen) return null;

  const panel = <CartPanel {...props} />;

  return (
    <>
      {/* Desktop: side column */}
      <div className="hidden lg:block lg:col-span-5 space-y-6">{panel}</div>

      {/* Mobile: bottom sheet */}
      <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
        <button
          type="button"
          aria-label={t.store.closeCart}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 max-h-[88vh] overflow-y-auto rounded-t-3xl border border-zinc-800 border-b-0 bg-zinc-950 shadow-2xl animate-in slide-in-from-bottom"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md">
            <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-zinc-700" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mt-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" /> {t.store.cart} (
              {props.cart.length})
            </h3>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'mt-2 p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white',
                btnInteractive,
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 pb-28">{panel}</div>
        </div>
      </div>
    </>
  );
}

function CartPanel({
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
  savedCards,
  selectedTokenId,
  setSelectedTokenId,
  saveCard,
  setSaveCard,
}: CartDrawerProps) {
  const { t } = useLocale();

  return (
    <div className="glass-bezel-outer lg:block">
      <div className="glass-bezel-inner p-0 lg:p-6 space-y-6 lg:space-y-6">
        <div className="hidden lg:flex justify-between items-center border-b border-zinc-900 pb-4">
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

        <div className="lg:contents space-y-6">
          {cart.length === 0 ? (
            <CartList cart={cart} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />
          ) : (
            <div className="space-y-6">
              <CartList
                cart={cart}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
              />

              <div className="pt-4 lg:pt-6 border-t border-zinc-900 space-y-6">
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
                    savedCards={savedCards}
                    selectedTokenId={selectedTokenId}
                    setSelectedTokenId={setSelectedTokenId}
                    saveCard={saveCard}
                    setSaveCard={setSaveCard}
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
