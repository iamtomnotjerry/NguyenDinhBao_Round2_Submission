'use client';

import { useState, useEffect, useRef, useOptimistic, startTransition } from 'react';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase/client';
import PageReveal from '@/components/PageReveal';
import { springSoft } from '@/lib/motion';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { PageShell, Surface } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { HeaderSlot } from '@/components/HeaderSlot';
import EmptyState from '@/components/EmptyState';
import AppFooter from '@/components/AppFooter';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { ShoppingBag, ShoppingCart, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import { useLocale } from '@/lib/i18n/context';
import {
  formatCardNumberDisplay,
  validateCardForSandbox,
  SANDBOX_TEST_CARDS,
} from '@/lib/payment/validate-card';
import { firstLocalizedCardError, localizeTokenizeApiError } from '@/lib/payment/card-i18n';
import { localizeApiError } from '@/lib/api/localize';
import { cn } from '@/lib/utils';
import type { SafeDatabase as DB } from '@/types/database.types';

type Product = SafeDatabase['public']['Tables']['products']['Row'];
type SavedCard = DB['public']['Tables']['payment_tokens']['Row'];

interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreClientProps {
  initialProducts?: Product[];
}

export default function StoreClient({ initialProducts }: StoreClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [loading, setLoading] = useState(!initialProducts?.length);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [optimisticCart, setOptimisticCart] = useOptimistic(cart);
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
        if (initialProducts?.length) {
          setProducts(initialProducts);
        } else {
          const prodRes = await fetch('/api/products');
          const prodData = await prodRes.json();
          setProducts(prodData);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
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
  }, [initialProducts]);

  // Cart Management
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const next = existing
      ? cart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      : [...cart, { product, quantity: 1 }];
    startTransition(() => {
      setOptimisticCart(next);
      setCart(next);
    });
    toast.success(t.toast.addedToCart, { description: product.name });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const next = cart
      .map((item) => {
        if (item.product.id === productId) {
          return { ...item, quantity: item.quantity + delta };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    startTransition(() => {
      setOptimisticCart(next);
      setCart(next);
    });
  };

  const removeFromCart = (productId: string) => {
    const next = cart.filter((item) => item.product.id !== productId);
    startTransition(() => {
      setOptimisticCart(next);
      setCart(next);
    });
    toast.success(t.toast.removedFromCart);
  };

  // Calculations (display uses optimistic cart)
  const subtotal = optimisticCart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const discount = usePoints ? Math.min(subtotal, rewardPoints * 0.1) : 0;
  const pointsUsed = usePoints ? Math.round(discount * 10) : 0;
  const pointsEarned = Math.floor(subtotal - discount);
  const total = Math.max(0, subtotal - discount);
  const cartCount = optimisticCart.reduce((sum, i) => sum + i.quantity, 0);

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
        if (!saved) throw new Error(t.errors.savedCardMissing);
        cardToken = saved.card_token;
      } else {
        const validation = validateCardForSandbox({ cardNumber, expiry, cvv });
        if (!validation.valid) {
          throw new Error(firstLocalizedCardError(validation, t));
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
        if (!tokenRes.ok) throw new Error(localizeTokenizeApiError(tokenData, t));
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

      if (deliveryType === 'delivery' && !address.trim()) {
        throw new Error(t.errors.missingDeliveryAddress);
      }

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
          delivery_address: deliveryType === 'delivery' ? address.trim() : null,
          recipient_name: name.trim() || null,
          idempotency_key: idempotencyKey,
          card_token: cardToken,
        }),
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        throw new Error(localizeApiError(checkoutData, t, t.store.checkoutFailApi));
      }

      setOrderResult({
        success: true,
        message: t.store.checkoutSuccessMsg,
        orderId: checkoutData.order?.id || checkoutData.order_id,
      });
      toast.success(t.toast.orderOk, {
        description: checkoutData.order?.id || checkoutData.order_id,
      });

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
      const message = err instanceof Error ? err.message : t.store.checkoutFailGeneric;
      setOrderResult({
        success: false,
        message,
      });
      toast.error(t.toast.orderFail, { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <HeaderSlot>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="relative rounded-full bg-muted/50 border border-edge hover:border-edge-strong text-secondary-strong hover:text-fg"
          aria-label={t.store.cart}
        >
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
          {reduce ? (
            <span className="text-xs font-bold pr-0.5 inline-block">{cartCount}</span>
          ) : (
            <motion.span
              key={cartCount}
              className="text-xs font-bold pr-0.5 inline-block"
              initial={{ scale: 0.55, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springSoft}
            >
              {cartCount}
            </motion.span>
          )}
        </Button>
      </HeaderSlot>

      {loading ? (
        <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
          <LoadingSkeleton variant="cards" />
        </main>
      ) : (
        <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          <div
            className={cn(
              isCartOpen ? 'lg:col-span-7' : 'lg:col-span-12',
              'transition-all duration-300 space-y-6',
            )}
          >
            <PageReveal>
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-fg to-secondary-strong bg-clip-text text-transparent flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-emerald-400" /> {t.store.title}
                </h2>
                {user && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 py-2 px-4 rounded-full text-emerald-400 text-sm font-bold">
                    <Gift className="w-4 h-4" />{' '}
                    {t.store.pointsAvailable.replace('{n}', String(rewardPoints))}
                  </div>
                )}
              </div>
            </PageReveal>

            {products.length === 0 ? (
              <Surface>
                <EmptyState
                  icon={ShoppingBag}
                  title={t.store.emptyProducts}
                  description={t.store.emptyProductsHint}
                  actionHref="/print"
                  actionLabel={t.common.startPrint}
                />
              </Surface>
            ) : (
              <div
                className={cn(
                  'grid grid-cols-1 md:grid-cols-2 gap-6',
                  isCartOpen ? 'xl:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-4',
                )}
              >
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                ))}
              </div>
            )}
          </div>

          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cart={optimisticCart}
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

      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      <AppFooter className="mt-20" />
    </PageShell>
  );
}
