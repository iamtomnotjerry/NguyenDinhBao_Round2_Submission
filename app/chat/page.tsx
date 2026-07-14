'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { MessageSquare, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { btnInteractive, cn } from '@/lib/utils';
import ChatBox from './components/ChatBox';
import { useLocale } from '@/lib/i18n/context';

type ChatMessageRow = SafeDatabase['public']['Tables']['chat_messages']['Row'];

export default function ChatPage() {
  const { t } = useLocale();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isForwarded, setIsForwarded] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize DefaultChatTransport to prevent recreating on every keystroke re-render.
  // Dependency on [sessionId] means transport is recreated once when sessionId changes (null → value).
  // This is safe: the old fetch callback continues executing for in-flight streams,
  // and the new transport only takes effect on the next message send.
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
        return response;
      },
    });
  }, [sessionId]);

  // Initialize Vercel AI SDK useChat hook using DefaultChatTransport
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: chatTransport,
    onFinish: ({ message }: { message: UIMessage }) => {
      // Extract text content from parts to check for Human Forward signal
      const text = (message.parts || [])
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('');

      if (text.includes('[FORWARD_TO_HUMAN]')) {
        setIsForwarded(true);
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Check auth and fetch/create chat session
  useEffect(() => {
    const initChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoadingAuth(false);

      if (user) {
        // Find existing active session or let API handle it
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (session) {
          setSessionId(session.id);

          // Load past messages
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

  // Scroll messages list to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Form Submission
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

  // Click default questions
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
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        /* Main Container */
        <main className="flex-1 max-w-4xl mx-auto px-6 py-4 w-full flex flex-col min-h-0 relative z-10">
          {!user ? (
            /* Unauthorized display */
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
          )}
        </main>
      )}

      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-4 bg-zinc-950 text-center text-xs text-zinc-650 shrink-0">
        {t.common.footer}
      </footer>
    </div>
  );
}
