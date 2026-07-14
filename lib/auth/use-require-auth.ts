'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/lib/auth/user-context';

/**
 * Client-side route guard — trusts the browser Supabase session (cookies).
 * Use on pages where server RSC auth can lag behind client session sync
 * (common after soft navigation or on Vercel edge).
 */
export function useRequireAuth(returnPath: string) {
  const router = useRouter();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading || user) return;
    router.replace(`/auth?next=${encodeURIComponent(returnPath)}`);
  }, [user, loading, returnPath, router]);

  return { user, loading, authed: Boolean(user) };
}
