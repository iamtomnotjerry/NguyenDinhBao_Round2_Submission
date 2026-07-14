'use client';

import { CreditCard, Truck, Sparkles, RefreshCw, Printer } from 'lucide-react';
import { btnInteractive, btnInteractiveSm, cn } from '@/lib/utils';
import type { CartItem } from './CartList';

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
}: CheckoutFormProps) {
  return (
    <form onSubmit={handleCheckoutSubmit} className="space-y-4">
      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-emerald-400" /> Thanh toán hóa đơn
      </h4>

      {/* Customer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
            Họ và tên người nhận
          </label>
          <input
            type="text"
            required
            placeholder="Nhập tên người nhận..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all duration-300 text-white font-medium"
          />
        </div>
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
            {deliveryType === 'delivery' ? 'Địa chỉ giao hàng' : 'Hình thức nhận hàng'}
          </label>
          <input
            type="text"
            required={deliveryType === 'delivery'}
            placeholder={
              deliveryType === 'delivery'
                ? 'Nhập địa chỉ giao hàng...'
                : 'Nhận tại cửa hàng (không cần địa chỉ)'
            }
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={deliveryType === 'pickup'}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all duration-300 text-white disabled:opacity-50 disabled:pointer-events-none font-medium"
          />
        </div>
      </div>

      {/* Delivery Type */}
      <div className="flex gap-2 bg-zinc-950/80 p-1 rounded-lg border border-zinc-900">
        <button
          type="button"
          onClick={() => {
            setDeliveryType('pickup');
            setAddress('');
          }}
          className={cn(
            'flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5',
            btnInteractive,
            deliveryType === 'pickup'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Printer className="w-3.5 h-3.5" /> Nhận tại cửa hàng
        </button>
        <button
          type="button"
          onClick={() => setDeliveryType('delivery')}
          className={cn(
            'flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5',
            btnInteractive,
            deliveryType === 'delivery'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Truck className="w-3.5 h-3.5" /> Giao tận nơi
        </button>
      </div>

      {/* Point Reward Deduction Checkbox */}
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
              className="text-xs font-semibold text-zinc-300 cursor-pointer select-none"
            >
              Dùng điểm thưởng giảm giá
            </label>
          </div>
          <span className="text-xs text-emerald-400 font-bold">Giảm -${discount.toFixed(2)}</span>
        </div>
      )}

      {/* Credit Card Information */}
      <div className="space-y-3.5">
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
            Số thẻ thanh toán
          </label>
          <div className="relative w-full">
            <input
              type="text"
              required
              placeholder="4111 2222 3333 4001"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all duration-300 text-white font-mono"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] text-zinc-650 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Visa / Master
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 flex flex-col items-start w-full">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
              Ngày hết hạn
            </label>
            <input
              type="text"
              required
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all duration-300 text-white text-center font-mono"
            />
          </div>
          <div className="space-y-1.5 flex flex-col items-start w-full">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
              Mã bảo mật CVV
            </label>
            <input
              type="password"
              required
              maxLength={3}
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all duration-300 text-white text-center font-mono"
            />
          </div>
        </div>
      </div>

      {/* Mock Sandbox Simulators Helper Tools */}
      <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2">
        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          <span>Sandbox Thử nghiệm lỗi</span>
          <span className="px-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded font-semibold scale-90">
            Simulate
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: '4001', label: 'Hết hạn (4001)', hover: 'hover:border-red-500/30' },
              { key: '4002', label: 'Từ chối (4002)', hover: 'hover:border-red-500/30' },
              { key: '4003', label: 'Timeout (4003)', hover: 'hover:border-orange-500/30' },
              { key: '9999', label: 'Thành công', hover: 'hover:border-emerald-500/30' },
            ] as const
          ).map((sim) => (
            <button
              key={sim.key}
              type="button"
              onClick={() => handleSelectSimCard(sim.key)}
              className={cn(
                'px-2 py-1 bg-zinc-900 border border-zinc-800 hover:text-white text-[9px] rounded text-zinc-400 font-bold',
                sim.hover,
                btnInteractiveSm,
              )}
            >
              {sim.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cost Summary block */}
      <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl space-y-2 text-xs font-semibold">
        <div className="flex justify-between">
          <span className="text-zinc-500">Tạm tính:</span>
          <span className="text-white">${subtotal.toFixed(2)}</span>
        </div>
        {usePoints && (
          <div className="flex justify-between text-emerald-400">
            <span>Điểm đã dùng ({pointsUsed} pts):</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-900/60 pt-2 text-sm font-bold">
          <span className="text-zinc-400">Tổng thanh toán:</span>
          <span className="text-white">${total.toFixed(2)}</span>
        </div>
        <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1.5 border-t border-dashed border-zinc-900">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Nhận +{pointsEarned} điểm thưởng từ đơn
          hàng này!
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || cart.length === 0}
        className={cn(
          'w-full py-3.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 hover:scale-[1.01]',
          btnInteractive,
        )}
      >
        {submitting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" /> Đang xử lý cổng thẻ...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" /> Thanh toán một chạm (${total.toFixed(2)})
          </>
        )}
      </button>
    </form>
  );
}
