'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Printer, User, LogIn } from 'lucide-react';

interface HeaderProps {
  children?: React.ReactNode;
}

export default function Header({ children }: HeaderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Get initial user state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen reactively to auth change events
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
    { name: 'In ấn từ xa', href: '/print' },
    { name: 'Gian hàng', href: '/store' },
    { name: 'Hỗ trợ AI', href: '/chat' },
  ];

  return (
    <header className="sticky top-4 z-50 transition-all duration-300 w-full px-4">
      <div className="max-w-5xl mx-auto bg-zinc-950/55 backdrop-blur-xl border border-zinc-900/80 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/50 transition-all">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform duration-300">
            <Printer className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:to-zinc-200 transition-all duration-300">
            PlatPrint
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4.5 py-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/35'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {children}
          {user ? (
            <Link
              href="/dashboard"
              className={`px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 text-xs font-bold rounded-full transition-all duration-200 border border-zinc-850 hover:border-zinc-700 flex items-center gap-1.5 ${
                pathname === '/dashboard' ? 'border-emerald-500/30 text-emerald-400' : ''
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" /> Dashboard
            </Link>
          ) : (
            <Link
              href="/auth"
              className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-full transition-all duration-300 shadow-lg shadow-emerald-600/10 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="w-3.5 h-3.5" /> Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
