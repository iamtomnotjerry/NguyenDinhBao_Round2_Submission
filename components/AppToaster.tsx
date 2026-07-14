'use client';

import { Toaster } from 'sonner';
import { useTheme } from '@/lib/theme/context';

export default function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border border-edge bg-elevated text-fg shadow-xl shadow-black/40 font-sans',
          title: 'text-sm font-semibold',
          description: 'text-xs text-secondary',
        },
      }}
    />
  );
}
