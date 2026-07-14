'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import {
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  CreditCard,
  Gift,
  Truck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Printer,
} from 'lucide-react';
import Link from 'next/link';

type Product = SafeDatabase['public']['Tables']['products']['Row'];

interface CartItem {
  product: Product;
  quantity: number;
}

const renderProductThumbnail = (name: string, stock: number) => {
  const isOut = stock === 0;
  const overlayClass = isOut ? 'grayscale opacity-50' : '';

  if (name.includes('Biểu mẫu') || name.includes('tờ khai')) {
    return (
      <div
        className={`w-full h-32 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/20 transition-all ${overlayClass}`}
      >
        <div className="w-16 h-20 bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex flex-col justify-between shadow-lg">
          <div className="space-y-1">
            <div className="w-full h-1 bg-zinc-800 rounded" />
            <div className="w-4/5 h-1 bg-zinc-850 rounded" />
            <div className="w-full h-1 bg-zinc-850 rounded" />
            <div className="w-2/3 h-1 bg-zinc-850 rounded" />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="w-4 h-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </div>
            <div className="w-5 h-1 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }
  if (name.includes('sách') || name.includes('hướng dẫn') || name.includes('handbook')) {
    return (
      <div
        className={`w-full h-32 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/20 transition-all ${overlayClass}`}
      >
        <div className="w-16 h-20 bg-emerald-950/20 border border-emerald-500/20 rounded-r-lg rounded-l p-2 flex flex-col justify-between shadow-lg relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/40 rounded-l" />
          <div className="pl-1 text-left space-y-1">
            <div className="w-10 h-1 bg-emerald-400 rounded" />
            <div className="w-8 h-1 bg-emerald-400/70 rounded" />
          </div>
          <div className="pl-1 mt-4 text-[6px] font-mono text-zinc-500">v2.1 Guide</div>
        </div>
      </div>
    );
  }
  if (name.includes('Tạp chí') || name.includes('magazine')) {
    return (
      <div
        className={`w-full h-32 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/20 transition-all ${overlayClass}`}
      >
        <div className="w-16 h-20 bg-zinc-950 border border-zinc-850 rounded-lg p-1.5 flex flex-col justify-between shadow-lg relative">
          <div className="w-full h-8 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded border border-emerald-500/10 flex items-center justify-center">
            <span className="text-[6px] font-black text-emerald-400 tracking-wider">MAG</span>
          </div>
          <div className="space-y-1 mt-2">
            <div className="w-full h-1 bg-zinc-800 rounded" />
            <div className="w-3/4 h-1 bg-zinc-900 rounded" />
          </div>
        </div>
      </div>
    );
  }
  if (name.includes('Báo cáo') || name.includes('report')) {
    return (
      <div
        className={`w-full h-32 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/20 transition-all ${overlayClass}`}
      >
        <div className="w-16 h-20 bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex flex-col justify-between shadow-lg relative">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:8px_8px] opacity-10 rounded-lg" />
          <div className="z-10 text-left space-y-1">
            <div className="w-8 h-1 bg-emerald-500 rounded" />
            <div className="w-12 h-1 bg-zinc-800 rounded" />
          </div>
          <div className="z-10 flex items-end justify-between">
            <div className="w-1.5 h-2.5 bg-emerald-500 rounded-sm" />
            <div className="w-1.5 h-3.5 bg-emerald-500 rounded-sm" />
            <div className="w-1.5 h-4.5 bg-emerald-500 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`w-full h-32 rounded-xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-center text-zinc-650 relative overflow-hidden group-hover:border-emerald-500/20 transition-all ${overlayClass}`}
    >
      <ShoppingBag className="w-12 h-12 text-zinc-850 group-hover:scale-105 transition-transform" />
    </div>
  );
};

export default function StorePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartLoaded = useRef(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('platprint_cart');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          timerId = setTimeout(() => {
            setCart(parsed);
          }, 0);
        } catch (e) {
          console.error('Failed to parse cart from localStorage:', e);
        }
      }
      cartLoaded.current = true;
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // Save cart to localStorage when it changes (only after loaded)
  useEffect(() => {
    if (typeof window !== 'undefined' && cartLoaded.current) {
      localStorage.setItem('platprint_cart', JSON.stringify(cart));
    }
  }, [cart]);

  // Checkout Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('pickup');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [usePoints, setUsePoints] = useState(false);

  // Flow State
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
  } | null>(null);

  // Fetch products and user auth profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products catalog
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();
        setProducts(prodData);

        // Fetch auth state
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Fetch reward points from profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('reward_points')
            .eq('id', user.id)
            .single();

          if (profile) {
            setRewardPoints(profile.reward_points);
          }
        }
      } catch (err) {
        console.error('Error fetching store data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cart Management
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const getSubtotal = () =>
    cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const getDiscount = () => {
    if (!usePoints) return 0;
    // 1 point = $0.1 discount
    const maxDiscount = getSubtotal();
    const pointDiscount = rewardPoints * 0.1;
    return Math.min(maxDiscount, pointDiscount);
  };
  const getPointsUsed = () => {
    if (!usePoints) return 0;
    const discount = getDiscount();
    // 10 points = $1
    return Math.round(discount * 10);
  };
  const getPointsEarned = () => {
    // 1 point for every $1 paid (subtotal minus discount)
    const paidAmount = getSubtotal() - getDiscount();
    return Math.floor(paidAmount);
  };
  const getTotal = () => Math.max(0, getSubtotal() - getDiscount());

  // Set card simulation numbers
  const handleSelectSimCard = (last4: string) => {
    if (last4 === '4001') {
      setCardNumber('4111222233334001');
      setExpiry('12/29');
      setCvv('123');
    } else if (last4 === '4002') {
      setCardNumber('4111222233334002');
      setExpiry('12/29');
      setCvv('234');
    } else if (last4 === '4003') {
      setCardNumber('4111222233334003');
      setExpiry('12/29');
      setCvv('345');
    } else {
      setCardNumber('4111222233339999');
      setExpiry('12/29');
      setCvv('000');
    }
  };

  // Perform Checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !user) return;
    setSubmitting(true);
    setOrderResult(null);

    try {
      const idempotencyKey = crypto.randomUUID();

      // 1. Tokenize Card Details (PCI-DSS compliance mock)
      const tokenRes = await fetch('/api/sandbox/payment/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_number: cardNumber, expiry, cvv }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || 'Tokenize thẻ thất bại');

      // 2. Submit order to checkout API
      const checkoutRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          total_amount: getTotal(),
          discount_amount: getDiscount(),
          points_used: getPointsUsed(),
          points_earned: getPointsEarned(),
          delivery_type: deliveryType,
          idempotency_key: idempotencyKey,
          card_token: tokenData.card_token,
        }),
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || 'Đặt hàng thanh toán thất bại');
      }

      setOrderResult({
        success: true,
        message: 'Thanh toán thành công! Đơn hàng của bạn đã được khởi tạo thành công.',
        orderId: checkoutData.order?.id || checkoutData.order_id,
      });

      // Clear cart
      setCart([]);
      setUsePoints(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('platprint_cart');
      }

      // Re-fetch profiles reward points
      const { data: profile } = await supabase
        .from('profiles')
        .select('reward_points')
        .eq('id', user.id)
        .single();
      if (profile) {
        setRewardPoints(profile.reward_points);
      }
    } catch (err) {
      setOrderResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : 'Đặt hàng thất bại. Vui lòng kiểm tra lại số dư hoặc tồn kho.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500 selection:text-black">
      <Header>
        <button
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="relative p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-all flex items-center gap-2"
        >
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
        </button>
      </Header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        /* Main Container */
        <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {/* Products Grid (7 cols) */}
          <div
            className={`${isCartOpen ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all duration-300 space-y-6`}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-emerald-400" /> Gian hàng ấn phẩm in sẵn
              </h2>
              {user && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 py-2 px-4 rounded-xl text-emerald-400 text-sm font-bold animate-pulse-slow">
                  <Gift className="w-4 h-4" /> {rewardPoints} điểm thưởng khả dụng
                </div>
              )}
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 ${isCartOpen ? 'xl:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-6`}
            >
              {products.map((product) => (
                <div key={product.id} className="glass-bezel-outer group">
                  <div className="glass-bezel-inner p-5 flex flex-col justify-between h-full min-h-[320px]">
                    <div className="space-y-4">
                      {/* Premium Product Visual Thumbnail representation */}
                      <div className="relative">
                        {renderProductThumbnail(product.name, product.stock)}
                        <div className="absolute bottom-2 left-2 bg-zinc-950/90 border border-zinc-800/80 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold text-zinc-450">
                          Tồn kho: {product.stock}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2 font-medium">
                          {product.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex justify-between items-center border-t border-zinc-900/60 pt-4">
                      <span className="text-base font-black text-white">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="py-2 px-4 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-600 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] cursor-pointer"
                      >
                        {product.stock === 0 ? 'Hết hàng' : 'Thêm giỏ hàng'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout & Cart Pane (5 cols) */}
          {isCartOpen && (
            <div className="lg:col-span-5 space-y-6 animate-fade-in">
              <div className="glass-bezel-outer">
                <div className="glass-bezel-inner p-6 flex flex-col min-h-[500px]">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-emerald-400" /> Giỏ hàng ({cart.length})
                    </h3>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="text-xs font-semibold text-zinc-500 hover:text-white transition-colors"
                    >
                      Đóng
                    </button>
                  </div>

                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-center text-zinc-500 p-8">
                      <ShoppingCart className="w-12 h-12 text-zinc-800 mb-3" />
                      <p className="text-sm font-semibold">Giỏ hàng của bạn đang trống.</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between">
                      {/* Cart list */}
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {cart.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white truncate">
                                {item.product.name}
                              </h4>
                              <span className="text-xs text-zinc-500 font-bold">
                                ${Number(item.product.price).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-bold w-4 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition-colors animate-none"
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors ml-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Payment Checkout Panel */}
                      <div className="mt-8 pt-6 border-t border-zinc-900 space-y-6">
                        {/* User Auth block checking */}
                        {!user ? (
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center text-sm">
                            <p className="text-zinc-400 mb-3">
                              Vui lòng đăng nhập để thanh toán đơn hàng.
                            </p>
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
                                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-red-500/30 text-[9px] rounded text-zinc-400 font-bold transition-all"
                                >
                                  Hết hạn (4001)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectSimCard('4002')}
                                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-red-500/30 text-[9px] rounded text-zinc-400 font-bold transition-all"
                                >
                                  Từ chối (4002)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectSimCard('4003')}
                                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 text-[9px] rounded text-zinc-400 font-bold transition-all"
                                >
                                  Timeout (4003)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectSimCard('9999')}
                                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 text-[9px] rounded text-zinc-400 font-bold transition-all"
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
                                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Nhận +
                                {getPointsEarned()} điểm thưởng từ đơn hàng này!
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
                                  <RefreshCw className="w-4 h-4 animate-spin" /> Đang xử lý cổng
                                  thẻ...
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
          )}
        </main>
      )}

      {/* Background Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-500 mt-20">
        &copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.
      </footer>
    </div>
  );
}
