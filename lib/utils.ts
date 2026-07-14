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

/** Standard micro-interaction classes for buttons and links */
export const btnInteractive = 'cursor-pointer transition-all duration-300 active:scale-[0.98]';
export const btnInteractiveSm = 'cursor-pointer transition-all duration-300 active:scale-95';
