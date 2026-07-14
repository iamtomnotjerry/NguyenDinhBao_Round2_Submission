'use client';

import { TransitionLink } from '@/components/TransitionLink';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { btnInteractive, cn } from '@/lib/utils';
import { easeOutExpo } from '@/lib/motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: EmptyStateProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3 py-10 px-4',
        className,
      )}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOutExpo }}
    >
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
        initial={reduce ? false : { scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: easeOutExpo }}
      >
        <Icon className="w-7 h-7" />
      </motion.div>
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-semibold text-secondary-strong">{title}</p>
        {description && <p className="text-xs text-muted-fg leading-relaxed">{description}</p>}
      </div>
      {actionHref && actionLabel && (
        <TransitionLink
          href={actionHref}
          className={cn(
            'mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25',
            btnInteractive,
          )}
        >
          {actionLabel}
        </TransitionLink>
      )}
    </motion.div>
  );
}
