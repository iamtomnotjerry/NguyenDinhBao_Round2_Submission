'use client';

import { useEffect, useState } from 'react';
import { TransitionLink } from '@/components/TransitionLink';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Printer, User, LogIn, Sun, Moon, Languages, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import { useTheme } from '@/lib/theme/context';
import { springSoft } from '@/lib/motion';

interface HeaderProps {
  children?: React.ReactNode;
}

export default function Header({ children }: HeaderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const reduce = useReducedMotion();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const navItems = [
    { name: t.nav.print, href: '/print' },
    { name: t.nav.store, href: '/store' },
    { name: t.nav.chat, href: '/chat' },
  ];

  return (
    <header className="sticky top-4 z-50 transition-all duration-300 w-full px-4">
      <div className="max-w-5xl mx-auto bg-elevated/55 backdrop-blur-xl border border-line/80 rounded-full px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/50 transition-all gap-2">
        <TransitionLink href="/" className="flex items-center gap-2.5 group shrink-0">
          <motion.div
            className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-lg shadow-emerald-500/10"
            whileHover={reduce ? undefined : { scale: 1.05 }}
            whileTap={reduce ? undefined : { scale: 0.95 }}
            transition={reduce ? { duration: 0 } : springSoft}
          >
            <Printer className="w-4 h-4 text-fg" />
          </motion.div>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-secondary bg-clip-text text-transparent group-hover:to-secondary-strong transition-all duration-300">
            {t.brand}
          </span>
        </TransitionLink>

        <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <TransitionLink
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-4.5 py-2 rounded-full',
                  btnInteractive,
                  isActive ? 'text-emerald-400' : 'text-secondary hover:text-fg hover:bg-muted/35',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="header-nav-pill"
                    className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm"
                    transition={reduce ? { duration: 0 } : springSoft}
                  />
                )}
                <span className="relative z-10">{item.name}</span>
              </TransitionLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new Event('platprint:command'))}
            aria-label={t.common.search}
            title={`${t.common.search} (⌘K)`}
            className="rounded-full p-2 border border-edge bg-muted/50 text-secondary-strong hover:text-fg hover:border-edge-strong"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
            title={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
            className="rounded-full p-2 border border-edge bg-muted/50 text-secondary-strong hover:text-fg hover:border-edge-strong"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
            aria-label={locale === 'vi' ? t.nav.langEn : t.nav.langVi}
            title={locale === 'vi' ? t.nav.langEn : t.nav.langVi}
            className="rounded-full px-2.5 py-1.5 border border-edge bg-muted/50 text-[10px] font-black uppercase tracking-wider text-secondary-strong hover:text-fg hover:border-edge-strong gap-1"
          >
            <Languages className="w-3 h-3 text-emerald-400" />
            {locale === 'vi' ? 'EN' : 'VI'}
          </Button>

          {children}

          {user ? (
            <TransitionLink
              href="/dashboard"
              className={cn(
                'px-3 sm:px-4 py-2 bg-muted/50 hover:bg-subtle text-xs font-bold rounded-full border border-edge hover:border-edge-strong flex items-center gap-1.5',
                btnInteractive,
                pathname === '/dashboard' && 'border-emerald-500/30 text-emerald-400',
              )}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />{' '}
              <span className="hidden sm:inline">{t.nav.dashboard}</span>
            </TransitionLink>
          ) : (
            <TransitionLink
              href="/auth"
              className={cn(
                'px-3 sm:px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-full shadow-lg shadow-emerald-600/10 flex items-center gap-1.5 hover:scale-[1.02] text-on-brand',
                btnInteractive,
              )}
            >
              <LogIn className="w-3.5 h-3.5" />{' '}
              <span className="hidden sm:inline">{t.nav.login}</span>
            </TransitionLink>
          )}
        </div>
      </div>
    </header>
  );
}
