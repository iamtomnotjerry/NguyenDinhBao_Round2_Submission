'use client';

import { TransitionLink } from '@/components/TransitionLink';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Printer, ShoppingBag, MessageSquare, LayoutDashboard } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { cn, hoverIdle } from '@/lib/utils';
import { springSoft } from '@/lib/motion';

/** Fixed bottom nav for mobile — desktop uses Header capsule nav. */
export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const reduce = useReducedMotion();

  const items = [
    { href: '/print', label: t.nav.print, icon: Printer },
    { href: '/store', label: t.nav.store, icon: ShoppingBag },
    { href: '/chat', label: t.nav.chat, icon: MessageSquare },
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
  ];

  return (
    <nav
      aria-label={t.nav.mobileNav}
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-edge/90 bg-elevated/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4 gap-0 max-w-lg mx-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <li key={href}>
              <TransitionLink
                href={href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold mx-1 rounded-xl',
                  active ? 'text-emerald-400' : cn('text-muted-fg', hoverIdle),
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-glow"
                    className="absolute inset-x-3 top-1 bottom-1 rounded-xl bg-emerald-500/10 border border-emerald-500/15"
                    transition={reduce ? { duration: 0 } : springSoft}
                  />
                )}
                <Icon
                  className={cn(
                    'relative z-10 w-5 h-5',
                    active && 'drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]',
                  )}
                />
                <span className="relative z-10 truncate max-w-[4.5rem]">{label}</span>
              </TransitionLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
