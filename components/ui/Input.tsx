import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, mono, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full bg-elevated border border-edge focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none transition-all disabled:opacity-50',
        mono && 'font-mono',
        className,
      )}
      {...props}
    />
  );
});
