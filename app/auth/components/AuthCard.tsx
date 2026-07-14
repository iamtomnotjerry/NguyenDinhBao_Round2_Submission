'use client';

import { Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import { easeOutExpo, springSoft } from '@/lib/motion';

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
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="w-full max-w-md z-10"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: easeOutExpo }}
    >
      <div className="glass-bezel-outer relative">
        <div className="glass-bezel-inner p-8 space-y-6">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              key={isSignUp ? 'signup' : 'signin'}
              className="p-3 bg-emerald-500/10 rounded-2xl w-fit text-emerald-400 mb-4 border border-emerald-500/20"
              initial={reduce ? false : { scale: 0.85, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={springSoft}
            >
              {isSignUp ? <UserPlus className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? 't-up' : 't-in'}
                className="text-center"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-2xl font-bold bg-gradient-to-r from-fg to-secondary-strong bg-clip-text text-transparent">
                  {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
                </h2>
                <p className="text-muted-fg text-sm mt-2 font-medium">
                  {isSignUp ? t.auth.signUpHint : t.auth.signInHint}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                key={message.text}
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  'overflow-hidden rounded-xl text-sm border',
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400',
                )}
              >
                <div className="p-4">{message.text}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-secondary tracking-wider uppercase">
                {t.auth.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg z-10 pointer-events-none" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 font-semibold"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-secondary tracking-wider uppercase">
                {t.auth.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg z-10 pointer-events-none" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 font-semibold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <motion.div
              whileHover={reduce || loading ? undefined : { scale: 1.015 }}
              whileTap={reduce || loading ? undefined : { scale: 0.985 }}
            >
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full mt-4 shadow-lg shadow-emerald-500/10"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-on-brand border-t-transparent rounded-full animate-spin" />
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" /> {t.auth.signUp}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> {t.auth.signIn}
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          <div className="mt-8 pt-6 border-t border-line text-center text-sm">
            <span className="text-muted-fg">{isSignUp ? t.auth.hasAccount : t.auth.noAccount}</span>{' '}
            <button
              type="button"
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
    </motion.div>
  );
}
