'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import AppFooter from '@/components/AppFooter';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { btnInteractive, cn } from '@/lib/utils';
import ChatBox from './components/ChatBox';
import { useLocale } from '@/lib/i18n/context';
import { HUMAN_HANDOFF_TOKEN } from '@/lib/chat/constants';

type ChatMessageRow = SafeDatabase['public']['Tables']['chat_messages']['Row'];
type ChatSessionRow = SafeDatabase['public']['Tables']['chat_sessions']['Row'];

export default function ChatPage() {
  const { t } = useLocale();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isForwarded, setIsForwarded] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [input, setInput] = useState('');
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
        setHandoffError(
          'Yêu cầu gặp nhân viên đã gửi nhưng chưa ghi nhận session. Vui lòng thử lại.',
        );
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

      setHandoffError(
        'Yêu cầu gặp nhân viên đã gửi nhưng chưa ghi nhận trên hệ thống. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
      );
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    const initChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoadingAuth(false);

      if (user) {
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
      }
    };
    initChat();
  }, [setMessages]);

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
    <div className="flex flex-col h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500 selection:text-white overflow-hidden">
      <Header />

      {loadingAuth ? (
        <LoadingSkeleton variant="chat" />
      ) : (
        <main className="flex-1 max-w-4xl mx-auto px-6 py-4 w-full flex flex-col min-h-0 relative z-10">
          {!user ? (
            <div className="flex-1 glass-bezel-outer flex flex-col min-h-0 h-full">
              <div className="glass-bezel-inner flex flex-col items-center justify-center p-12 text-center space-y-6 flex-1 min-h-0 h-full justify-center">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                  <MessageSquare className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold">{t.chat.loginTitle}</h2>
                <p className="text-zinc-400 max-w-md">{t.chat.loginDesc}</p>
                <Link
                  href="/auth"
                  className={cn(
                    'px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl font-bold text-sm hover:scale-[1.02] text-white',
                    btnInteractive,
                  )}
                >
                  {t.chat.loginCta}
                </Link>
              </div>
            </div>
          ) : (
            <>
              {handoffError && (
                <div
                  role="alert"
                  className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                >
                  {handoffError}
                </div>
              )}
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
            </>
          )}
        </main>
      )}

      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      <AppFooter className="py-3 shrink-0" />
    </div>
  );
}
