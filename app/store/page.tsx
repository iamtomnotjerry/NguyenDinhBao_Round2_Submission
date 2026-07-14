'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { ShoppingBag, ShoppingCart, Gift, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';

type Product = SafeDatabase['public']['Tables']['products']['Row'];

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorePage() {
  const router = useRouter();
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
        message:
          'Thanh toán thành công! Đơn hàng của bạn đã được khởi tạo thành công. Bạn đang được chuyển hướng đến trang quản lý đơn hàng...',
        orderId: checkoutData.order?.id || checkoutData.order_id,
      });

      // Clear cart
      setCart([]);
      setUsePoints(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('platprint_cart');
      }

      // Redirect to dashboard orders list after 2.5 seconds
      setTimeout(() => {
        router.push('/dashboard?tab=orders');
      }, 2500);

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
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          </div>

          {/* Checkout & Cart Pane (5 cols) */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cart={cart}
            user={user}
            rewardPoints={rewardPoints}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
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
            orderResult={orderResult}
            setOrderResult={setOrderResult}
            handleSelectSimCard={handleSelectSimCard}
            getSubtotal={getSubtotal}
            getDiscount={getDiscount}
            getPointsUsed={getPointsUsed}
            getTotal={getTotal}
            getPointsEarned={getPointsEarned}
            handleCheckoutSubmit={handleCheckoutSubmit}
          />
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
