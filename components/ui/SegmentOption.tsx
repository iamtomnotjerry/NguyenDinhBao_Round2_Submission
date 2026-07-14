import { cn, btnInteractive } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type SegmentOptionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  /** Dense chips (finishes, sim cards) */
  dense?: boolean;
  /** Use radio semantics when inside role="radiogroup" */
  radio?: boolean;
};

/** Segment / chip control for option groups (print config, saved cards). */
export function SegmentOption({
  selected,
  dense,
  radio,
  className,
  type = 'button',
  ...props
}: SegmentOptionProps) {
  return (
    <button
      type={type}
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? Boolean(selected) : undefined}
      className={cn(
        btnInteractive,
        'rounded-xl border font-bold transition-colors',
        dense ? 'px-2.5 py-1.5 text-[10px] rounded-lg' : 'py-2 px-1 text-xs',
        selected
          ? 'border-emerald-500 bg-emerald-500/5 text-fg'
          : 'border-edge text-secondary hover:text-fg',
        className,
      )}
      {...props}
    />
  );
}

/** Wrapper that marks a group of SegmentOptions as a radiogroup. */
export function SegmentGroup({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {children}
    </div>
  );
}
