import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning';

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-muted border-edge text-secondary',
  brand: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  danger: 'bg-red-500/10 border-red-500/20 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
