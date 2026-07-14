import { cn } from '@/lib/utils';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full bg-elevated border border-edge focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3 py-2.5 text-sm text-fg focus:outline-none transition-all disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
