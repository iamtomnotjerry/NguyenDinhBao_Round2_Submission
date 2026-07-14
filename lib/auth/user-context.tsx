'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type AuthUserContextValue = {
  user: SupabaseUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthUserContext = createContext<AuthUserContextValue | null>(null);

export function AuthUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const {
      data: { user: next },
    } = await supabase.auth.getUser();
    setUser(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const {
        data: { user: next },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUser(next);
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, refreshUser }), [user, loading, refreshUser]);

  return <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser() {
  const ctx = useContext(AuthUserContext);
  if (!ctx) throw new Error('useAuthUser must be used within AuthUserProvider');
  return ctx;
}
