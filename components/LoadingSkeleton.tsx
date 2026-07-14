'use client';

import { motion, useReducedMotion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/motion';

interface LoadingSkeletonProps {
  variant?: 'page' | 'cards' | 'dashboard' | 'chat';
  className?: string;
}

export default function LoadingSkeleton({ variant = 'page', className }: LoadingSkeletonProps) {
  const reduce = useReducedMotion();

  if (variant === 'chat') {
    return (
      <motion.div
        className={cn('flex-1 flex flex-col gap-4 p-6 animate-pulse', className)}
        variants={fadeIn}
        initial={reduce ? false : 'hidden'}
        animate="show"
      >
        <div className="h-10 w-48 rounded-xl bg-subtle/80" />
        <div className="space-y-3 mt-4">
          <div className="h-16 w-3/4 rounded-2xl bg-muted/80 ml-auto" />
          <div className="h-20 w-2/3 rounded-2xl bg-subtle/60" />
          <div className="h-14 w-1/2 rounded-2xl bg-muted/80 ml-auto" />
        </div>
      </motion.div>
    );
  }

  if (variant === 'cards') {
    return (
      <motion.div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse',
          className,
        )}
        variants={fadeIn}
        initial={reduce ? false : 'hidden'}
        animate="show"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-bezel-outer">
            <div className="glass-bezel-inner p-4 space-y-3">
              <div className="h-32 rounded-xl bg-subtle/70" />
              <div className="h-4 w-3/4 rounded bg-subtle/80" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-9 rounded-xl bg-subtle/60" />
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <motion.div
        className={cn('grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse', className)}
        variants={fadeIn}
        initial={reduce ? false : 'hidden'}
        animate="show"
      >
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-bezel-outer">
            <div className="glass-bezel-inner p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-subtle mx-auto" />
              <div className="h-4 w-2/3 mx-auto rounded bg-subtle" />
              <div className="h-3 w-1/2 mx-auto rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-9 space-y-4">
          <div className="h-40 rounded-2xl bg-muted/80 border border-edge" />
          <div className="h-24 rounded-2xl bg-muted/60 border border-edge" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn('flex-1 flex flex-col items-center justify-center gap-3 py-20', className)}
      variants={fadeIn}
      initial={reduce ? false : 'hidden'}
      animate="show"
    >
      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      <div className="h-2.5 w-28 rounded-full bg-subtle animate-pulse" />
    </motion.div>
  );
}
