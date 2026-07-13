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
    <header className="border-b border-zinc-900 bg-zinc-950/65 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-300">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:to-zinc-200 transition-all duration-300">
            PlatPrint
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/5 font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
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
              className={`px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 text-sm font-semibold rounded-xl transition-all duration-200 border border-zinc-850 hover:border-zinc-700 flex items-center gap-2 ${
                pathname === '/dashboard' ? 'border-indigo-500/30 text-indigo-400' : ''
              }`}
            >
              <User className="w-4 h-4 text-indigo-400" /> Dashboard
            </Link>
          ) : (
            <Link
              href="/auth"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/15 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" /> Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
