'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, Lock, UserPlus, LogIn, Printer } from 'lucide-react';
import Link from 'next/link';

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
      {/* Header */}
      <header className="sticky top-4 z-50 transition-all duration-300 w-full px-4">
        <div className="max-w-5xl mx-auto bg-zinc-950/55 backdrop-blur-xl border border-zinc-900/80 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/50">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform duration-300">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              PlatPrint
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md z-10">
          <div className="glass-bezel-outer relative">
            <div className="glass-bezel-inner p-8 space-y-6">
              <div className="flex flex-col items-center mb-8">
                <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit text-emerald-400 mb-4 border border-emerald-500/20 animate-pulse-slow">
                  {isSignUp ? <UserPlus className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
                </div>
                <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                  {isSignUp ? 'Tạo tài khoản mới' : 'Chào mừng trở lại'}
                </h2>
                <p className="text-zinc-500 text-sm mt-2 text-center font-medium">
                  {isSignUp
                    ? 'Đăng ký để gửi lệnh in từ xa và sử dụng điểm thưởng.'
                    : 'Đăng nhập vào tài khoản PlatPrint của bạn.'}
                </p>
              </div>

              {message && (
                <div
                  className={`p-4 rounded-xl text-sm mb-6 border ${
                    message.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-550" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all text-white font-semibold"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-550" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all text-white font-semibold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4" /> Đăng ký
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" /> Đăng nhập
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-zinc-900 text-center text-sm">
                <span className="text-zinc-500">
                  {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                </span>{' '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setMessage(null);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
                >
                  {isSignUp ? 'Đăng nhập ngay' : 'Đăng ký tài khoản mới'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 bg-zinc-950 text-center text-xs text-zinc-600">
        &copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.
      </footer>
    </div>
  );
}
