'use client';

import { Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import React from 'react';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';

interface AuthCardProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  loading: boolean;
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
  message: { type: 'success' | 'error'; text: string } | null;
  setMessage: (val: { type: 'success' | 'error'; text: string } | null) => void;
  handleAuth: (e: React.FormEvent) => void;
}

export default function AuthCard({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  isSignUp,
  setIsSignUp,
  message,
  setMessage,
  handleAuth,
}: AuthCardProps) {
  const { t } = useLocale();

  return (
    <div className="w-full max-w-md z-10">
      <div className="glass-bezel-outer relative">
        <div className="glass-bezel-inner p-8 space-y-6">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit text-emerald-400 mb-4 border border-emerald-500/20 animate-pulse-slow">
              {isSignUp ? <UserPlus className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
            </h2>
            <p className="text-zinc-500 text-sm mt-2 text-center font-medium">
              {isSignUp ? t.auth.signUpHint : t.auth.signInHint}
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
                {t.auth.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
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
                {t.auth.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
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
              className={cn(
                'w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 hover:scale-[1.01] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4 text-white',
                btnInteractive,
              )}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" /> {t.auth.signUp}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> {t.auth.signIn}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-900 text-center text-sm">
            <span className="text-zinc-500">{isSignUp ? t.auth.hasAccount : t.auth.noAccount}</span>{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className={cn(
                'text-emerald-400 hover:text-emerald-300 font-semibold',
                btnInteractive,
              )}
            >
              {isSignUp ? t.auth.signInNow : t.auth.signUpNow}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
