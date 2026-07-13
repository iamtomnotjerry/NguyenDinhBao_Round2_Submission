import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tw-merge';

/**
 * Utility function to merge Tailwind CSS classes dynamically
 * without style conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
