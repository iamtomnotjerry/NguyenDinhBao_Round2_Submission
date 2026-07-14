import { cn, btnInteractive } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-on-brand shadow-lg shadow-emerald-500/10 border border-transparent',
  secondary: 'bg-muted/80 hover:bg-subtle text-fg border border-edge hover:border-edge-strong',
  ghost:
    'bg-transparent hover:bg-muted/40 text-secondary-strong hover:text-fg border border-transparent',
  danger:
    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40',
  outline:
    'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-600 hover:border-emerald-500 text-emerald-400 hover:text-on-brand',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-sm rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:pointer-events-none',
        btnInteractive,
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
});
