'use client';

import { type ReactNode } from 'react';
import { LocaleProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/lib/theme/context';
import MobileNav from '@/components/MobileNav';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        {children}
        <MobileNav />
      </LocaleProvider>
    </ThemeProvider>
  );
}
