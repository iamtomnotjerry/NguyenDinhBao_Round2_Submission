'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Printer, User, LogIn, Sun, Moon, Languages } from 'lucide-react';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import { useTheme } from '@/lib/theme/context';

interface HeaderProps {
  children?: React.ReactNode;
}

export default function Header({ children }: HeaderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const { theme, toggleTheme } = useTheme();

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
      <div className="max-w-5xl mx-auto bg-zinc-950/55 backdrop-blur-xl border border-zinc-900/80 rounded-full px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/50 transition-all gap-2">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform duration-300">
            <Printer className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:to-zinc-200 transition-all duration-300">
            {t.brand}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4.5 py-2 rounded-full',
                  btnInteractive,
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/35',
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
            title={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
            className={cn(
              'p-2 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:text-white hover:border-zinc-700',
              btnInteractive,
            )}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
            aria-label={locale === 'vi' ? t.nav.langEn : t.nav.langVi}
            title={locale === 'vi' ? t.nav.langEn : t.nav.langVi}
            className={cn(
              'px-2.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center gap-1',
              btnInteractive,
            )}
          >
            <Languages className="w-3 h-3 text-emerald-400" />
            {locale === 'vi' ? 'EN' : 'VI'}
          </button>

          {children}

          {user ? (
            <Link
              href="/dashboard"
              className={cn(
                'px-3 sm:px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 text-xs font-bold rounded-full border border-zinc-800 hover:border-zinc-700 flex items-center gap-1.5',
                btnInteractive,
                pathname === '/dashboard' && 'border-emerald-500/30 text-emerald-400',
              )}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />{' '}
              <span className="hidden sm:inline">{t.nav.dashboard}</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              className={cn(
                'px-3 sm:px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-full shadow-lg shadow-emerald-600/10 flex items-center gap-1.5 hover:scale-[1.02] text-white',
                btnInteractive,
              )}
            >
              <LogIn className="w-3.5 h-3.5" />{' '}
              <span className="hidden sm:inline">{t.nav.login}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
