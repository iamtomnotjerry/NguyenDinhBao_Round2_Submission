import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export { calculatePrintCost, buildPrintQuote } from '@/lib/print/pricing';
export type { PrintQuote, PriceLine } from '@/lib/print/pricing';

/**
 * Utility function to merge Tailwind CSS classes dynamically
 * without style conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Keyboard focus ring — matches Input emerald focus treatment */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]';

/** Standard micro-interaction classes for buttons and links */
export const btnInteractive = `cursor-pointer transition-all duration-300 active:scale-[0.98] ${focusRing}`;
export const btnInteractiveSm = `cursor-pointer transition-all duration-300 active:scale-95 ${focusRing}`;

/** Idle nav / chip hover — full muted fill so it stays visible on light glass panels */
export const hoverIdle = `cursor-pointer transition-colors hover:bg-muted hover:text-fg ${focusRing}`;

/**
 * Clamp a `?next=` redirect target to same-site relative paths.
 * Blocks open redirects (`https://evil`, `//evil`, `/\evil`).
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }
  return raw;
}
