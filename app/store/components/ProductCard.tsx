'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { SafeDatabase } from '@/types/database.types';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';

type Product = SafeDatabase['public']['Tables']['products']['Row'];

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

/** Remote HTTPS (or data/blob) only — local /images/* placeholders are not shipped. */
function isRenderableProductImage(url: string | null | undefined): url is string {
  if (!url) return false;
  if (url.startsWith('https://') || url.startsWith('http://')) return true;
  if (url.startsWith('blob:') || url.startsWith('data:')) return true;
  return false;
}

function MockThumb({ name, stock }: { name: string; stock: number }) {
  const isOut = stock === 0;
  const overlayClass = isOut ? 'grayscale opacity-50' : '';
  const shell = cn(
    'w-full h-32 rounded-xl bg-muted border border-edge flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/20 transition-all',
    overlayClass,
  );

  if (name.includes('Biểu mẫu') || name.includes('tờ khai')) {
    return (
      <div className={shell}>
        <div className="w-16 h-20 bg-elevated border border-edge rounded-lg p-2 flex flex-col justify-between shadow-lg">
          <div className="space-y-1">
            <div className="w-full h-1 bg-subtle rounded" />
            <div className="w-4/5 h-1 bg-subtle rounded" />
            <div className="w-full h-1 bg-subtle rounded" />
            <div className="w-2/3 h-1 bg-subtle rounded" />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="w-4 h-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </div>
            <div className="w-5 h-1 bg-subtle rounded" />
          </div>
        </div>
      </div>
    );
  }
  if (name.includes('sách') || name.includes('hướng dẫn') || name.includes('handbook')) {
    return (
      <div className={shell}>
        <div className="w-16 h-20 bg-emerald-950/20 border border-emerald-500/20 rounded-r-lg rounded-l p-2 flex flex-col justify-between shadow-lg relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/40 rounded-l" />
          <div className="pl-1 text-left space-y-1">
            <div className="w-10 h-1 bg-emerald-400 rounded" />
            <div className="w-8 h-1 bg-emerald-400/70 rounded" />
          </div>
          <div className="pl-1 mt-4 text-[6px] font-mono text-muted-fg">v2.1 Guide</div>
        </div>
      </div>
    );
  }
  if (name.includes('Tạp chí') || name.includes('magazine')) {
    return (
      <div className={shell}>
        <div className="w-16 h-20 bg-elevated border border-edge rounded-lg p-1.5 flex flex-col justify-between shadow-lg">
          <div className="w-full h-8 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded border border-emerald-500/10 flex items-center justify-center">
            <span className="text-[6px] font-black text-emerald-400 tracking-wider">MAG</span>
          </div>
          <div className="space-y-1 mt-2">
            <div className="w-full h-1 bg-subtle rounded" />
            <div className="w-3/4 h-1 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }
  if (name.includes('Báo cáo') || name.includes('report')) {
    return (
      <div className={shell}>
        <div className="w-16 h-20 bg-elevated border border-edge rounded-lg p-2 flex flex-col justify-between shadow-lg relative">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:8px_8px] opacity-10 rounded-lg" />
          <div className="z-10 text-left space-y-1">
            <div className="w-8 h-1 bg-emerald-500 rounded" />
            <div className="w-12 h-1 bg-subtle rounded" />
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
    <div className={cn(shell, 'bg-elevated/60')}>
      <ShoppingBag className="w-12 h-12 text-faint group-hover:scale-105 transition-transform" />
    </div>
  );
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const isOutOfStock = product.stock === 0;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = isRenderableProductImage(product.image_url) && !imgFailed;

  return (
    <motion.div
      className="glass-bezel-outer interactive group h-full"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -5 }}
    >
      <div className="glass-bezel-inner p-5 flex flex-col justify-between h-full min-h-[320px]">
        <div className="space-y-4">
          <div className="relative">
            {showImage ? (
              <div
                className={cn(
                  'relative w-full h-32 rounded-xl overflow-hidden border border-edge bg-muted',
                  isOutOfStock && 'grayscale opacity-50',
                )}
              >
                <Image
                  src={product.image_url!}
                  alt={product.name}
                  fill
                  sizes="(max-width:768px) 100vw, 25vw"
                  className="object-cover"
                  unoptimized={
                    product.image_url!.startsWith('blob:') || product.image_url!.startsWith('data:')
                  }
                  onError={() => setImgFailed(true)}
                />
              </div>
            ) : (
              <MockThumb name={product.name} stock={product.stock} />
            )}
            <div className="absolute bottom-2 left-2 bg-elevated/90 border border-edge/80 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold text-secondary">
              {t.store.stock}: {product.stock}
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-fg group-hover:text-emerald-400 transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-muted-fg mt-1 line-clamp-2 font-medium">
              {product.description}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-between items-center border-t border-line/60 pt-4">
          <span className="text-base font-black text-fg">${Number(product.price).toFixed(2)}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
          >
            {isOutOfStock ? t.store.outOfStock : t.store.addToCart}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
