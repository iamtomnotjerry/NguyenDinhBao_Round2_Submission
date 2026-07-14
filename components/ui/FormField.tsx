import { cn } from '@/lib/utils';
import type { LabelHTMLAttributes, ReactNode } from 'react';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-xs font-semibold text-secondary tracking-wider uppercase block',
        className,
      )}
      {...props}
    />
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
    </div>
  );
}
