'use client';

import { type ReactNode } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { LocaleProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/lib/theme/context';
import MobileNav from '@/components/MobileNav';
import AppToaster from '@/components/AppToaster';
import CommandPalette from '@/components/CommandPalette';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider>
        <LocaleProvider>
          {children}
          <MobileNav />
          <AppToaster />
          <CommandPalette />
        </LocaleProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}
