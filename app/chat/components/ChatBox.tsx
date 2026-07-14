'use client';

import { UIMessage } from '@ai-sdk/react';
import { HelpCircle, User, Sparkles, AlertCircle, Send, Clock } from 'lucide-react';
import React, { RefObject } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { btnInteractive, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/lib/i18n/context';
import { sanitizeText } from '@/lib/sanitize';
import { easeOutExpo, springSoft, fadeUp } from '@/lib/motion';

interface ChatBoxProps {
  messages: UIMessage[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  isForwarded: boolean;
  handleQuickQuestion: (q: string) => void;
  handleSubmitForm: (e: React.FormEvent) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export default function ChatBox({
  messages,
  input,
  setInput,
  isLoading,
  isForwarded,
  handleQuickQuestion,
  handleSubmitForm,
  messagesEndRef,
}: ChatBoxProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  const messageEnter = (role: string) =>
    reduce
      ? { opacity: 1, x: 0, y: 0 }
      : {
          opacity: 0,
          x: role === 'user' ? 14 : -14,
          y: 10,
        };

  return (
    <div className="flex-1 glass-bezel-outer flex flex-col min-h-0 h-full">
      <div className="glass-bezel-inner !p-0 flex flex-col overflow-hidden bg-elevated/40 relative flex-1 min-h-0 h-full">
        {/* Top Indicator bar */}
        <div className="border-b border-line p-4 bg-elevated/80 backdrop-blur flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-fg">{t.chat.title}</h3>
              <p className="text-[10px] text-muted-fg font-semibold uppercase tracking-wider">
                {isForwarded ? t.chat.humanMode : t.chat.aiMode}
              </p>
            </div>
          </div>
          <AnimatePresence>
            {isForwarded && (
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-bold"
              >
                <Clock className="w-3.5 h-3.5" /> {t.chat.waiting}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <motion.div
              initial={reduce ? false : fadeUp.hidden}
              animate={fadeUp.show}
              transition={{ duration: 0.55, ease: easeOutExpo }}
              className="h-full flex flex-col justify-center items-center text-center space-y-6 max-w-md mx-auto"
            >
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 animate-pulse-slow">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-fg text-base">{t.chat.emptyTitle}</h4>
                <p className="text-xs text-secondary leading-relaxed">{t.chat.emptyDesc}</p>
              </div>

              <div className="w-full space-y-2.5 pt-4">
                <p className="text-[10px] text-muted-fg font-bold uppercase tracking-wider text-left pl-1">
                  {t.chat.suggestions}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleQuickQuestion(t.chat.q1)}
                  className="w-full justify-start text-left p-3.5 h-auto bg-elevated hover:bg-muted border border-line hover:border-emerald-500/30 hover:pl-5 text-xs rounded-xl text-secondary-strong hover:text-fg border-l-2 border-l-emerald-500 font-semibold"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  {t.chat.q1}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleQuickQuestion(t.chat.q2)}
                  className="w-full justify-start text-left p-3.5 h-auto bg-elevated hover:bg-muted border border-line hover:border-emerald-500/30 hover:pl-5 text-xs rounded-xl text-secondary-strong hover:text-fg border-l-2 border-l-emerald-500 font-semibold"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  {t.chat.q2}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleQuickQuestion(t.chat.q3)}
                  className="w-full justify-start text-left p-3.5 h-auto bg-elevated hover:bg-muted border border-line hover:border-emerald-500/30 hover:pl-5 text-xs rounded-xl text-secondary-strong hover:text-fg border-l-2 border-l-emerald-500 font-semibold"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  {t.chat.q3}
                </Button>
              </div>
            </motion.div>
          ) : (
            messages.map((m: UIMessage) => {
              const text = (m.parts || [])
                .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                .map((part) => part.text)
                .join('');

              const displayContent = sanitizeText(text.replace(/\[FORWARD_TO_HUMAN\]/g, '').trim());

              return (
                <motion.div
                  key={m.id}
                  initial={messageEnter(m.role)}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.4, ease: easeOutExpo }}
                  className={`flex gap-4 max-w-[85%] ${
                    m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 border ${
                      m.role === 'user'
                        ? 'bg-muted border-edge text-emerald-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content Bubble */}
                  <div className="space-y-1">
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-fg rounded-tr-none shadow-lg shadow-emerald-950/10'
                          : 'bg-muted/40 border border-line/80 backdrop-blur-md text-fg rounded-tl-none shadow-inner'
                      }`}
                    >
                      {m.role === 'user' ? (
                        displayContent
                      ) : (
                        <div className="space-y-1.5 text-secondary-strong">
                          {(() => {
                            const lines = displayContent.split('\n');
                            return lines.map((line, idx) => {
                              const boldRegex = /\*\*([^*]+)\*\*/g;
                              const formatInline = (str: string) => {
                                const parts = [];
                                let lastIndex = 0;
                                let match;
                                while ((match = boldRegex.exec(str)) !== null) {
                                  if (match.index > lastIndex) {
                                    parts.push(str.substring(lastIndex, match.index));
                                  }
                                  parts.push(
                                    <strong key={match.index} className="font-bold text-fg">
                                      {match[1]}
                                    </strong>,
                                  );
                                  lastIndex = boldRegex.lastIndex;
                                }
                                if (lastIndex < str.length) {
                                  parts.push(str.substring(lastIndex));
                                }
                                return parts.length > 0 ? parts : str;
                              };

                              const bulletMatch = /^(\s*)[\*\-]\s+(.+)/.exec(line);
                              const numberedMatch = /^(\s*)(\d+)\.\s+(.+)/.exec(line);

                              if (bulletMatch) {
                                const isNested = bulletMatch[1].length > 0;
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-start gap-2 my-1.5 leading-relaxed ${
                                      isNested
                                        ? 'ml-6 pl-1.5 text-secondary'
                                        : 'ml-2 text-secondary-strong'
                                    }`}
                                  >
                                    <span className="text-emerald-400 select-none font-bold shrink-0">
                                      •
                                    </span>
                                    <span className="flex-1">{formatInline(bulletMatch[2])}</span>
                                  </div>
                                );
                              }

                              if (numberedMatch) {
                                const isNested = numberedMatch[1].length > 0;
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-start gap-2 my-2 leading-relaxed ${
                                      isNested
                                        ? 'ml-6 pl-1.5 text-secondary'
                                        : 'ml-2 text-secondary-strong'
                                    }`}
                                  >
                                    <span className="text-emerald-400 select-none font-extrabold shrink-0">
                                      {numberedMatch[2]}.
                                    </span>
                                    <span className="flex-1">{formatInline(numberedMatch[3])}</span>
                                  </div>
                                );
                              }

                              if (line.trim() === '') {
                                return <div key={idx} className="h-2" />;
                              }

                              return (
                                <p key={idx} className="text-secondary-strong my-1 leading-relaxed">
                                  {formatInline(line)}
                                </p>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-faint block pl-2">
                      {m.role === 'user'
                        ? t.chat.you
                        : isForwarded
                          ? t.chat.support
                          : t.chat.assistant}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Loader/Thinking animation */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10, x: -10 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 6 }}
                transition={{ duration: 0.3, ease: easeOutExpo }}
                className="flex gap-4 max-w-[85%]"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="bg-muted/40 border border-line p-4 rounded-2xl rounded-tl-none text-secondary text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Alert Banner if session is forwarded to human support */}
        <AnimatePresence>
          {isForwarded && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: easeOutExpo }}
              className="bg-amber-500/10 border-y border-amber-500/20 p-3 px-6 text-xs text-amber-400 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
              <span>
                <strong>{t.chat.forwardTitle}</strong> {t.chat.forwardDesc}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Submission Bar */}
        <form
          onSubmit={handleSubmitForm}
          className="border-t border-line p-4 bg-elevated/80 flex gap-3 z-10"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-elevated border border-edge focus:border-emerald-500 py-3 px-4 rounded-xl text-sm focus:outline-none transition-all text-fg placeholder:text-muted-fg"
            placeholder={t.chat.placeholder}
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || isLoading}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            transition={springSoft}
            className={cn(
              'p-3 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-on-brand shadow-lg shadow-emerald-500/15 flex items-center justify-center hover:scale-105',
              btnInteractive,
            )}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
