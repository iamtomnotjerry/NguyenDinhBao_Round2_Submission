'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { ShoppingBag, ShoppingCart, Gift, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { btnInteractive, cn } from '@/lib/utils';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import { useLocale } from '@/lib/i18n/context';
import {
  formatCardNumberDisplay,
  validateCardForSandbox,
  SANDBOX_TEST_CARDS,
} from '@/lib/payment/validate-card';
import type { SafeDatabase as DB } from '@/types/database.types';

type Product = SafeDatabase['public']['Tables']['products']['Row'];
type SavedCard = DB['public']['Tables']['payment_tokens']['Row'];

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorePage() {
  const { t } = useLocale();
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
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(true);

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
          const { data: tokens } = await supabase
            .from('payment_tokens')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false });
          if (tokens) setSavedCards(tokens);
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
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const discount = usePoints ? Math.min(subtotal, rewardPoints * 0.1) : 0;
  const pointsUsed = usePoints ? Math.round(discount * 10) : 0;
  const pointsEarned = Math.floor(subtotal - discount);
  const total = Math.max(0, subtotal - discount);

  // Set card simulation numbers
  const handleSelectSimCard = (last4: string) => {
    setSelectedTokenId(null);
    const key =
      last4 === '4001'
        ? 'expired'
        : last4 === '4002'
          ? 'decline'
          : last4 === '4003'
            ? 'timeout'
            : 'success';
    const card = SANDBOX_TEST_CARDS[key];
    setCardNumber(formatCardNumberDisplay(card.number));
    setExpiry(card.expiry);
    setCvv(card.cvv);
  };

  // Perform Checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !user) return;
    setSubmitting(true);
    setOrderResult(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      let cardToken = '';

      if (selectedTokenId) {
        const saved = savedCards.find((c) => c.id === selectedTokenId);
        if (!saved) throw new Error('Saved card not found');
        cardToken = saved.card_token;
      } else {
        const validation = validateCardForSandbox({ cardNumber, expiry, cvv });
        if (!validation.valid) {
          throw new Error(
            validation.errors.number ||
              validation.errors.expiry ||
              validation.errors.cvv ||
              'Visa information is invalid.',
          );
        }

        const tokenRes = await fetch('/api/sandbox/payment/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: validation.digits,
            expiry,
            cvv,
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error || 'Tokenize thẻ thất bại');
        cardToken = tokenData.card_token;

        if (saveCard) {
          await fetch('/api/payment-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              card_token: tokenData.card_token,
              card_brand: tokenData.card_brand,
              last4: tokenData.last4,
              exp_month: tokenData.exp_month,
              exp_year: tokenData.exp_year,
              is_default: true,
            }),
          });
        }
      }

      // 2. Submit order to checkout API
      const checkoutRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          use_points: usePoints,
          points_used: pointsUsed,
          delivery_type: deliveryType,
          idempotency_key: idempotencyKey,
          card_token: cardToken,
        }),
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || t.store.checkoutFailApi);
      }

      setOrderResult({
        success: true,
        message: t.store.checkoutSuccessMsg,
        orderId: checkoutData.order?.id || checkoutData.order_id,
      });

      // Clear cart
      setCart([]);
      setUsePoints(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('platprint_cart');
      }

      setTimeout(() => {
        router.push('/dashboard?tab=orders');
      }, 2500);

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
        message: err instanceof Error ? err.message : t.store.checkoutFailGeneric,
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
          className={cn(
            'relative p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 hover:text-white flex items-center gap-2',
            btnInteractive,
          )}
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
        </main>
      )}

      {/* Background Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-500 mt-20">
        {t.common.footer}
      </footer>
    </div>
  );
}
