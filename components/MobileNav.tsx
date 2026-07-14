'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Printer, ShoppingBag, MessageSquare, LayoutDashboard } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

/** Fixed bottom nav for mobile — desktop uses Header capsule nav. */
export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = [
    { href: '/print', label: t.nav.print, icon: Printer },
    { href: '/store', label: t.nav.store, icon: ShoppingBag },
    { href: '/chat', label: t.nav.chat, icon: MessageSquare },
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
  ];

  return (
    <nav
      aria-label="Mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800/90 bg-zinc-950/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4 gap-0 max-w-lg mx-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
                  active ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <Icon
                  className={cn('w-5 h-5', active && 'drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]')}
                />
                <span className="truncate max-w-[4.5rem]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
