import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
}

/** Design-system surface — glass bezel shell rooted in theme tokens. */
export function Surface({
  className,
  padded = true,
  interactive,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div className={cn('glass-bezel-outer', interactive && 'interactive', className)} {...props}>
      <div className={cn('glass-bezel-inner', !padded && '!p-0')}>{children}</div>
    </div>
  );
}

/** Page shell using semantic background token instead of hardcoded #050505. */
export function PageShell({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-emerald-500 selection:text-black',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
