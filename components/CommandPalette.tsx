'use client';

import { useEffect, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useRouter, usePathname } from 'next/navigation';
import {
  Printer,
  ShoppingBag,
  MessageSquare,
  LayoutDashboard,
  LogIn,
  Search,
  Sparkles,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('platprint:command', onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('platprint:command', onOpen);
    };
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const authHref =
    pathname && pathname !== '/' && pathname !== '/auth'
      ? `/auth?next=${encodeURIComponent(pathname)}`
      : '/auth';

  const items = [
    { href: '/print', label: t.nav.print, icon: Printer, hint: t.command.printHint },
    { href: '/store', label: t.nav.store, icon: ShoppingBag, hint: t.command.storeHint },
    { href: '/chat', label: t.nav.chat, icon: MessageSquare, hint: t.command.chatHint },
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard, hint: t.command.dashHint },
    { href: authHref, label: t.nav.login, icon: LogIn, hint: t.command.authHint },
    { href: '/', label: t.brand, icon: Sparkles, hint: t.command.homeHint },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-[101] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-edge bg-elevated shadow-2xl shadow-black/60 focus:outline-none"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">{t.command.title}</Dialog.Title>
          <Command label={t.command.title}>
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="w-4 h-4 text-muted-fg shrink-0" aria-hidden />
              <Command.Input
                placeholder={t.command.placeholder}
                className="w-full bg-transparent py-3.5 text-sm text-fg placeholder:text-faint outline-none"
                aria-keyshortcuts="Meta+K Control+K"
              />
              <kbd className="hidden sm:inline text-[10px] font-bold text-faint border border-edge rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-[320px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-xs text-muted-fg">
                {t.command.empty}
              </Command.Empty>
              <Command.Group
                heading={t.command.navGroup}
                className="text-[10px] font-bold uppercase tracking-wider text-faint px-2 py-1.5"
              >
                {items.map(({ href, label, icon: Icon, hint }) => (
                  <Command.Item
                    key={href}
                    value={`${label} ${hint}`}
                    onSelect={() => go(href)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary-strong cursor-pointer',
                      'data-[selected=true]:bg-emerald-500/10 data-[selected=true]:text-emerald-300',
                    )}
                  >
                    <Icon className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />
                    <span className="font-semibold flex-1">{label}</span>
                    <span className="text-[10px] text-faint truncate max-w-[40%]">{hint}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="border-t border-line px-3 py-2 text-[10px] text-faint flex justify-between">
              <span>{t.command.hint}</span>
              <span aria-hidden>⌘K / Ctrl+K</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
