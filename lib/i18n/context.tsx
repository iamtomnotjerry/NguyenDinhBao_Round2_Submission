'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { en } from './en';
import { vi } from './vi';
import type { Dictionary, Locale } from './types';

const STORAGE_KEY = 'platprint_locale';
const EVENT = 'platprint-locale';

const dictionaries: Record<Locale, Dictionary> = { vi, en };

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'vi';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'vi' ? stored : 'vi';
  } catch {
    return 'vi';
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getServerSnapshot(): Locale {
  return 'vi';
}

function writeLocaleCookie(locale: Locale) {
  try {
    document.cookie = `${STORAGE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readStoredLocale, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
    writeLocaleCookie(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    writeLocaleCookie(next);
    document.documentElement.lang = next;
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
