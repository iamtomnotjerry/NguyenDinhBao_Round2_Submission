'use client';

import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  CreditCard,
  Truck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Printer,
} from 'lucide-react';

type Product = SafeDatabase['public']['Tables']['products']['Row'];

interface CartItem {
  product: Product;
  quantity: number;
}

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
  getSubtotal: () => number;
  getDiscount: () => number;
  getPointsUsed: () => number;
  getTotal: () => number;
  getPointsEarned: () => number;
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
  getSubtotal,
  getDiscount,
  getPointsUsed,
  getTotal,
  getPointsEarned,
  handleCheckoutSubmit,
}: CartDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="lg:col-span-5 space-y-6">
      <div className="glass-bezel-outer">
        <div className="glass-bezel-inner p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" /> Giỏ hàng ({cart.length})
            </h3>
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-bold transition-colors cursor-pointer"
            >
              Đóng lại
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-3">
              <ShoppingCart className="w-12 h-12 text-zinc-800 mx-auto" />
              <p className="text-sm font-semibold">Giỏ hàng của bạn đang trống.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items List */}
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
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-90"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all cursor-pointer active:scale-90 ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Checkout Panel */}
              <div className="mt-8 pt-6 border-t border-zinc-900 space-y-6">
                {!user ? (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center text-sm">
                    <p className="text-zinc-400 mb-3">Vui lòng đăng nhập để thanh toán đơn hàng.</p>
                    <Link
                      href="/auth"
                      className="inline-block py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Đăng nhập ngay
                    </Link>
                  </div>
                ) : orderResult ? (
                  /* Order Checkout Result Banner */
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
                      onClick={() => setOrderResult(null)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline pt-2 block mx-auto cursor-pointer"
                    >
                      Quay lại giỏ hàng
                    </button>
                  </div>
                ) : (
                  /* Checkout Form */
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
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-white font-medium"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col items-start w-full">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                          {deliveryType === 'delivery'
                            ? 'Địa chỉ giao hàng'
                            : 'Hình thức nhận hàng'}
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
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-white disabled:opacity-50 disabled:pointer-events-none font-medium"
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
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          deliveryType === 'pickup'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5" /> Nhận tại cửa hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType('delivery')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          deliveryType === 'delivery'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
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
                        <span className="text-xs text-emerald-400 font-bold">
                          Giảm -${getDiscount().toFixed(2)}
                        </span>
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
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-white font-mono"
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
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-white text-center font-mono"
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
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-white text-center font-mono"
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
                        <button
                          type="button"
                          onClick={() => handleSelectSimCard('4001')}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:text-white text-[9px] rounded text-zinc-400 font-bold transition-all cursor-pointer active:scale-95"
                        >
                          Hết hạn (4001)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSimCard('4002')}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:text-white text-[9px] rounded text-zinc-400 font-bold transition-all cursor-pointer active:scale-95"
                        >
                          Từ chối (4002)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSimCard('4003')}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 hover:text-white text-[9px] rounded text-zinc-400 font-bold transition-all cursor-pointer active:scale-95"
                        >
                          Timeout (4003)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSimCard('9999')}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 hover:text-white text-[9px] rounded text-zinc-400 font-bold transition-all cursor-pointer active:scale-95"
                        >
                          Thành công
                        </button>
                      </div>
                    </div>

                    {/* Cost Summary block */}
                    <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl space-y-2 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Tạm tính:</span>
                        <span className="text-white">${getSubtotal().toFixed(2)}</span>
                      </div>
                      {usePoints && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Điểm đã dùng ({getPointsUsed()} pts):</span>
                          <span>-${getDiscount().toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-zinc-900/60 pt-2 text-sm font-bold">
                        <span className="text-zinc-400">Tổng thanh toán:</span>
                        <span className="text-white">${getTotal().toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1.5 border-t border-dashed border-zinc-900">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Nhận +{getPointsEarned()}{' '}
                        điểm thưởng từ đơn hàng này!
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting || cart.length === 0}
                      className="w-full py-3.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Đang xử lý cổng thẻ...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" /> Thanh toán một chạm ($
                          {getTotal().toFixed(2)})
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
