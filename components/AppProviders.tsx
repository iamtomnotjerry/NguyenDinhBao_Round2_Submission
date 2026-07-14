'use client';

import { type ReactNode } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { LocaleProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/lib/theme/context';
import { AuthUserProvider } from '@/lib/auth/user-context';
import Header from '@/components/Header';
import { HeaderActionsProvider } from '@/components/HeaderSlot';
import MobileNav from '@/components/MobileNav';
import AppToaster from '@/components/AppToaster';
import CommandPalette from '@/components/CommandPalette';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider>
        <LocaleProvider>
          <AuthUserProvider>
            <HeaderActionsProvider>
              <Header />
              {children}
              <MobileNav />
              <AppToaster />
              <CommandPalette />
            </HeaderActionsProvider>
          </AuthUserProvider>
        </LocaleProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}
