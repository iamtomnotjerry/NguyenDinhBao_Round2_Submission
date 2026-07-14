'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'page' | 'cards' | 'dashboard' | 'chat';
  className?: string;
}

export default function LoadingSkeleton({ variant = 'page', className }: LoadingSkeletonProps) {
  if (variant === 'chat') {
    return (
      <div className={cn('flex-1 flex flex-col gap-4 p-6 animate-pulse', className)}>
        <div className="h-10 w-48 rounded-xl bg-zinc-800/80" />
        <div className="space-y-3 mt-4">
          <div className="h-16 w-3/4 rounded-2xl bg-zinc-900/80 ml-auto" />
          <div className="h-20 w-2/3 rounded-2xl bg-zinc-800/60" />
          <div className="h-14 w-1/2 rounded-2xl bg-zinc-900/80 ml-auto" />
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse',
          className,
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-bezel-outer">
            <div className="glass-bezel-inner p-4 space-y-3">
              <div className="h-32 rounded-xl bg-zinc-800/70" />
              <div className="h-4 w-3/4 rounded bg-zinc-800/80" />
              <div className="h-3 w-1/2 rounded bg-zinc-900" />
              <div className="h-9 rounded-xl bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse', className)}>
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-bezel-outer">
            <div className="glass-bezel-inner p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto" />
              <div className="h-4 w-2/3 mx-auto rounded bg-zinc-800" />
              <div className="h-3 w-1/2 mx-auto rounded bg-zinc-900" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-9 space-y-4">
          <div className="h-40 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
          <div className="h-24 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col items-center justify-center gap-3 py-20', className)}>
      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      <div className="h-2.5 w-28 rounded-full bg-zinc-800 animate-pulse" />
    </div>
  );
}
