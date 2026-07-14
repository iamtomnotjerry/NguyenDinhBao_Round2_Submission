'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthCard from './components/AuthCard';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign up logic
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.user && data.session === null) {
          setMessage({
            type: 'success',
            text: 'Đăng ký thành công! Hãy kiểm tra hộp thư email của bạn để xác nhận tài khoản.',
          });
        } else {
          setMessage({
            type: 'success',
            text: 'Đăng ký thành công! Đang chuyển hướng...',
          });
          router.push('/dashboard');
        }
      } else {
        // Sign in logic
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Đăng nhập thành công! Đang chuyển hướng...',
        });

        // Wait briefly for redirect to look smooth
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

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

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 bg-zinc-950 text-center text-xs text-zinc-600">
        &copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.
      </footer>
    </div>
  );
}
