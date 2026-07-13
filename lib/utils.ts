import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes dynamically
 * without style conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Unifies print cost calculations across frontend pages and backend API routes.
 */
export function calculatePrintCost(
  totalPages: number,
  copies: number,
  configColor: 'color' | 'bw',
  configBinding: 'none' | 'stapled' | 'spiral',
): number {
  const pagePrice = configColor === 'color' ? 0.5 : 0.1;
  const bindingPrice = configBinding === 'spiral' ? 2.0 : configBinding === 'stapled' ? 0.5 : 0.0;
  return totalPages * copies * pagePrice + bindingPrice;
}
