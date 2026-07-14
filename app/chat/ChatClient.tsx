'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { easeOutExpo, fadeUp } from '@/lib/motion';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import AppFooter from '@/components/AppFooter';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { PageShell } from '@/components/ui/Surface';
import ChatBox from './components/ChatBox';
import { useLocale } from '@/lib/i18n/context';
import { HUMAN_HANDOFF_TOKEN } from '@/lib/chat/constants';
import { useRequireAuth } from '@/lib/auth/use-require-auth';

type ChatMessageRow = SafeDatabase['public']['Tables']['chat_messages']['Row'];
type ChatSessionRow = SafeDatabase['public']['Tables']['chat_sessions']['Row'];

export default function ChatClient() {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const { user, loading: authLoading } = useRequireAuth('/chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isForwarded, setIsForwarded] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loadingSession, setLoadingSession] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        sessionId: sessionId,
      },
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        const xSessionId = response.headers.get('X-Session-Id');
        if (xSessionId && !sessionId) {
          setSessionId(xSessionId);
        }
        if (response.headers.get('X-Chat-Handoff') === 'waiting_support') {
          setIsForwarded(true);
          setHandoffError(null);
        }
        return response;
      },
    });
  }, [sessionId]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: chatTransport,
    onFinish: async ({ message }: { message: UIMessage }) => {
      const text = (message.parts || [])
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('');

      if (!text.includes(HUMAN_HANDOFF_TOKEN)) return;

      const sid =
        sessionId ||
        // Fallback: newest open session for this user
        (
          await supabase
            .from('chat_sessions')
            .select('id, status')
            .in('status', ['waiting_support', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.id;

      if (!sid) {
        setHandoffError(t.errors.handoffNoSession);
        return;
      }

      // Allow server onFinish to persist, then verify durable DB state
      for (const delay of [300, 700, 1200]) {
        await new Promise((r) => setTimeout(r, delay));
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('status')
          .eq('id', sid)
          .maybeSingle();
        if (error) {
          setHandoffError(error.message);
          return;
        }
        if (data?.status === 'waiting_support') {
          setIsForwarded(true);
          setHandoffError(null);
          return;
        }
      }

      setHandoffError(t.errors.handoffNotPersisted);
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (authLoading || !user) return;

    const initChat = async () => {
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['waiting_support', 'active'])
        .order('created_at', { ascending: false })
        .limit(10);

      const list = (sessions || []) as ChatSessionRow[];
      const session =
        list.find((s) => s.status === 'waiting_support') ||
        list.find((s) => s.status === 'active') ||
        null;

      if (session) {
        setSessionId(session.id);
        if (session.status === 'waiting_support') {
          setIsForwarded(true);
        }

        const { data: pastMsgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (pastMsgs) {
          setMessages(
            pastMsgs.map((m: ChatMessageRow) => ({
              id: m.id,
              role: m.sender === 'user' ? 'user' : 'assistant',
              parts: [{ type: 'text', text: m.message }],
            })),
          );
        }
      }
      setLoadingSession(false);
    };
    void initChat();
  }, [user, authLoading, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const textToSend = input;
    setInput('');

    try {
      await sendMessage({ text: textToSend });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleQuickQuestion = async (questionText: string) => {
    if (isLoading) return;
    try {
      await sendMessage({ text: questionText });
    } catch (err) {
      console.error('Error sending quick question:', err);
    }
  };

  return (
    <PageShell className="h-screen overflow-hidden selection:text-fg">
      {authLoading || loadingSession ? (
        <LoadingSkeleton variant="chat" />
      ) : (
        <main className="flex-1 max-w-4xl mx-auto px-6 py-4 w-full flex flex-col min-h-0 relative z-10">
          <motion.div
            initial={reduce ? false : fadeUp.hidden}
            animate={fadeUp.show}
            transition={{ duration: 0.55, ease: easeOutExpo }}
            className="flex-1 flex flex-col min-h-0"
          >
            <AnimatePresence>
              {handoffError && (
                <motion.div
                  role="alert"
                  initial={reduce ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: easeOutExpo }}
                  className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                >
                  {handoffError}
                </motion.div>
              )}
            </AnimatePresence>
            <ChatBox
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              isForwarded={isForwarded}
              handleQuickQuestion={handleQuickQuestion}
              handleSubmitForm={handleSubmitForm}
              messagesEndRef={messagesEndRef}
            />
          </motion.div>
        </main>
      )}

      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      <AppFooter className="py-3 shrink-0" />
    </PageShell>
  );
}
