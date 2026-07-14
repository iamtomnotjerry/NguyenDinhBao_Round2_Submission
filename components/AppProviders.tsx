'use client';

import { type ReactNode } from 'react';
import { LocaleProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/lib/theme/context';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}
