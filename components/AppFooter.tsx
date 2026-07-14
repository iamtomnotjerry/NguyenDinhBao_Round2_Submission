'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/context';
import { btnInteractive, cn } from '@/lib/utils';

export default function AppFooter({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <footer
      className={cn(
        'border-t border-zinc-900/80 py-6 md:py-8 bg-zinc-950/80 text-center text-xs text-zinc-500 mt-auto shrink-0',
        className,
      )}
    >
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>{t.common.footer}</p>
        <div className="flex items-center gap-4 text-zinc-500">
          <Link href="/print" className={cn('hover:text-emerald-400', btnInteractive)}>
            {t.nav.print}
          </Link>
          <Link href="/store" className={cn('hover:text-emerald-400', btnInteractive)}>
            {t.nav.store}
          </Link>
          <Link href="/chat" className={cn('hover:text-emerald-400', btnInteractive)}>
            {t.nav.chat}
          </Link>
        </div>
      </div>
    </footer>
  );
}
