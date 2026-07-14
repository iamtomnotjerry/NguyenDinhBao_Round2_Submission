'use client';

import { CreditCard, Truck, Sparkles, RefreshCw, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SegmentOption, SegmentGroup } from '@/components/ui/SegmentOption';
import type { CartItem } from './CartList';
import { useLocale } from '@/lib/i18n/context';

interface CheckoutFormProps {
  cart: CartItem[];
  rewardPoints: number;
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

export default function CheckoutForm({
  cart,
  rewardPoints,
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
  handleSelectSimCard,
  subtotal,
  discount,
  pointsUsed,
  total,
  pointsEarned,
  handleCheckoutSubmit,
  savedCards = [],
  selectedTokenId = null,
  setSelectedTokenId,
  saveCard = true,
  setSaveCard,
}: CheckoutFormProps) {
  const { t } = useLocale();

  return (
    <form onSubmit={handleCheckoutSubmit} className="space-y-4">
      <h4 className="text-xs font-bold text-muted-fg uppercase tracking-wider flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-emerald-400" /> {t.store.checkoutTitle}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider pl-1">
            {t.store.recipientName}
          </label>
          <Input
            type="text"
            required
            placeholder={t.store.recipientPlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xs font-medium"
          />
        </div>
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider pl-1">
            {deliveryType === 'delivery' ? t.store.addressLabel : t.store.pickupLabel}
          </label>
          <Input
            type="text"
            required={deliveryType === 'delivery'}
            placeholder={
              deliveryType === 'delivery' ? t.store.addressPlaceholder : t.store.pickupPlaceholder
            }
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={deliveryType === 'pickup'}
            className="text-xs font-medium"
          />
        </div>
      </div>

      <SegmentGroup
        label={t.store.checkoutTitle}
        className="flex gap-2 bg-elevated/80 p-1 rounded-lg border border-line"
      >
        <SegmentOption
          radio
          selected={deliveryType === 'pickup'}
          onClick={() => {
            setDeliveryType('pickup');
            setAddress('');
          }}
          className={cn(
            'flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5',
            deliveryType === 'pickup' && 'border-transparent bg-emerald-600 text-on-brand',
          )}
        >
          <Printer className="w-3.5 h-3.5" /> {t.store.pickup}
        </SegmentOption>
        <SegmentOption
          radio
          selected={deliveryType === 'delivery'}
          onClick={() => setDeliveryType('delivery')}
          className={cn(
            'flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5',
            deliveryType === 'delivery' && 'border-transparent bg-emerald-600 text-on-brand',
          )}
        >
          <Truck className="w-3.5 h-3.5" /> {t.store.delivery}
        </SegmentOption>
      </SegmentGroup>

      {rewardPoints > 0 && (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use-points"
              checked={usePoints}
              onChange={(e) => setUsePoints(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
            <label
              htmlFor="use-points"
              className="text-xs font-semibold text-secondary-strong cursor-pointer select-none"
            >
              {t.store.usePoints}
            </label>
          </div>
          <span className="text-xs text-emerald-400 font-bold">
            {t.store.discount} -${discount.toFixed(2)}
          </span>
        </div>
      )}

      <div className="space-y-3.5">
        {savedCards.length > 0 && setSelectedTokenId && (
          <SegmentGroup label={t.store.newCard} className="flex flex-wrap gap-1.5">
            <SegmentOption
              dense
              radio
              selected={!selectedTokenId}
              onClick={() => setSelectedTokenId(null)}
              className={!selectedTokenId ? 'border-emerald-500/40 text-emerald-300' : undefined}
            >
              {t.store.newCard}
            </SegmentOption>
            {savedCards.map((c) => (
              <SegmentOption
                key={c.id}
                dense
                radio
                selected={selectedTokenId === c.id}
                onClick={() => setSelectedTokenId(c.id)}
                className={
                  selectedTokenId === c.id ? 'border-emerald-500/40 text-emerald-300' : undefined
                }
              >
                {c.card_brand} ••{c.last4}
              </SegmentOption>
            ))}
          </SegmentGroup>
        )}

        {!selectedTokenId && (
          <>
            <div className="space-y-1.5 flex flex-col items-start w-full">
              <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider pl-1">
                {t.store.cardNumber}
              </label>
              <div className="relative w-full">
                <Input
                  type="text"
                  required={!selectedTokenId}
                  placeholder="4111 1111 1111 1111"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  mono
                  className="text-xs pr-24"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] text-muted-fg bg-muted border border-edge px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Visa / Master
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col items-start w-full">
                <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider pl-1">
                  {t.store.expiry}
                </label>
                <Input
                  type="text"
                  required={!selectedTokenId}
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  mono
                  className="text-xs text-center"
                />
              </div>
              <div className="space-y-1.5 flex flex-col items-start w-full">
                <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider pl-1">
                  {t.store.cvv}
                </label>
                <Input
                  type="password"
                  required={!selectedTokenId}
                  maxLength={4}
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  mono
                  className="text-xs text-center"
                />
              </div>
            </div>
            {setSaveCard && (
              <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="accent-emerald-500"
                />
                {t.store.saveCard}
              </label>
            )}
          </>
        )}
      </div>

      <div className="p-3 bg-elevated/60 border border-line rounded-xl space-y-2">
        <div className="flex justify-between items-center text-[10px] text-muted-fg font-bold uppercase tracking-wider">
          <span>{t.store.sandboxTitle}</span>
          <span className="px-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded font-semibold scale-90">
            {t.store.simulate}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: '4001', label: t.store.simExpired },
              { key: '4002', label: t.store.simDecline },
              { key: '4003', label: t.store.simTimeout },
              { key: '9999', label: t.store.simSuccess },
            ] as const
          ).map((sim) => (
            <SegmentOption
              key={sim.key}
              dense
              onClick={() => handleSelectSimCard(sim.key)}
              className="bg-muted text-[9px]"
            >
              {sim.label}
            </SegmentOption>
          ))}
        </div>
      </div>

      <div className="bg-elevated/60 p-4 border border-line rounded-xl space-y-2 text-xs font-semibold">
        <div className="flex justify-between">
          <span className="text-muted-fg">{t.store.subtotal}</span>
          <span className="text-fg">${subtotal.toFixed(2)}</span>
        </div>
        {usePoints && (
          <div className="flex justify-between text-emerald-400">
            <span>
              {t.store.pointsUsed} ({pointsUsed} pts):
            </span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-line/60 pt-2 text-sm font-bold">
          <span className="text-secondary">{t.store.totalPay}</span>
          <span className="text-fg">${total.toFixed(2)}</span>
        </div>
        <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1.5 border-t border-dashed border-line">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />{' '}
          {t.store.earnPoints.replace('{n}', String(pointsEarned))}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={submitting || cart.length === 0}
        className="w-full hover:scale-[1.01]"
      >
        {submitting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" /> {t.store.paying}
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" /> {t.store.payNow} (${total.toFixed(2)})
          </>
        )}
      </Button>
    </form>
  );
}
