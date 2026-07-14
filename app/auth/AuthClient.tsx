'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/ui/Surface';
import AppFooter from '@/components/AppFooter';
import AuthCard from './components/AuthCard';
import { useLocale } from '@/lib/i18n/context';
import { safeNextPath } from '@/lib/utils';
import { useAuthUser } from '@/lib/auth/user-context';

export default function AuthClient() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const { user, loading: authLoading } = useAuthUser();
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Already signed in — bounce back to intended page (full navigation syncs cookies)
  useEffect(() => {
    if (authLoading || !user) return;
    window.location.replace(nextPath);
  }, [authLoading, user, nextPath]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Preserve the intended destination through the email-confirm loop
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (error) throw error;

        if (data.user && data.session === null) {
          setMessage({
            type: 'success',
            text: t.auth.signupSuccessConfirm,
          });
          toast.success(t.toast.signupOk);
        } else {
          setMessage({
            type: 'success',
            text: t.auth.signupSuccessRedirect,
          });
          toast.success(t.toast.signupOk);
          window.location.href = nextPath;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success(t.toast.authOk);
        // Hard navigation ensures auth cookies are on the next request (Vercel/SSR)
        window.location.href = nextPath;
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : t.auth.genericError;
      setMessage({
        type: 'error',
        text,
      });
      toast.error(t.toast.authFail, { description: text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="selection:text-fg">
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"
          animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none"
          animate={reduce ? undefined : { x: [0, 24, 0], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />

        <AuthCard
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          loading={loading}
          isSignUp={isSignUp}
          setIsSignUp={setIsSignUp}
          message={message}
          setMessage={setMessage}
          handleAuth={handleAuth}
        />
      </main>

      <AppFooter />
    </PageShell>
  );
}
