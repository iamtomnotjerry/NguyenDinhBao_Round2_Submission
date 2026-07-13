'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Send,
  Printer,
  Sparkles,
  User,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

type ChatMessageRow = SafeDatabase['public']['Tables']['chat_messages']['Row'];

export default function ChatPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isForwarded, setIsForwarded] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Vercel AI SDK useChat hook using DefaultChatTransport
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        sessionId: sessionId,
      },
    }),
    onFinish: ({ message }) => {
      // Extract text content from parts to check for Human Forward signal
      const text = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
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

      // If we don't have a sessionId, fetch the one created by the server
      if (!sessionId && user) {
        setTimeout(async () => {
          const { data: session } = await supabase
            .from('chat_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();
          if (session) {
            setSessionId(session.id);
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Click default questions
  const handleQuickQuestion = async (questionText: string) => {
    if (isLoading) return;
    try {
      await sendMessage({ text: questionText });

      // If we don't have a sessionId, fetch the one created by the server
      if (!sessionId && user) {
        setTimeout(async () => {
          const { data: session } = await supabase
            .from('chat_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();
          if (session) {
            setSessionId(session.id);
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Error sending quick question:', err);
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              PlatPrint
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="/print" className="hover:text-white transition-colors">
              In ấn từ xa
            </Link>
            <Link href="/store" className="hover:text-white transition-colors">
              Gian hàng
            </Link>
            <Link href="/chat" className="text-white">
              Hỗ trợ AI
            </Link>
          </nav>
          <div>
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-sm font-semibold rounded-lg transition-colors border border-zinc-800 hover:border-zinc-700 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-indigo-400" /> Dashboard
              </Link>
            ) : (
              <Link
                href="/auth"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-600/10"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full flex flex-col h-[calc(100vh-140px)] min-h-[500px] relative z-10">
        {!user ? (
          /* Unauthorized display */
          <div className="flex-1 flex flex-col items-center justify-center p-12 glass-panel rounded-3xl border border-zinc-800 text-center space-y-6">
            <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20">
              <MessageSquare className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold">Vui lòng đăng nhập để sử dụng chat hỗ trợ</h2>
            <p className="text-zinc-400 max-w-md">
              Để được hỗ trợ giải đáp các thắc mắc về in ấn từ xa, lỗi thanh toán thẻ hoặc kiểm tra
              điểm thưởng, bạn cần đăng nhập tài khoản.
            </p>
            <Link
              href="/auth"
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl font-bold text-sm transition-transform hover:scale-[1.02]"
            >
              Đăng nhập / Đăng ký
            </Link>
          </div>
        ) : (
          /* Chat Interface Container */
          <div className="flex-1 glass-panel rounded-3xl border border-zinc-800 flex flex-col overflow-hidden bg-zinc-950/40 relative">
            {/* Top Indicator bar */}
            <div className="border-b border-zinc-900 p-4 bg-zinc-950/80 backdrop-blur flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white">Trợ lý hỗ trợ PlatPrint</h3>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                    {isForwarded ? 'Đã kết nối với hỗ trợ viên (Human)' : 'Trả lời tự động bằng AI'}
                  </p>
                </div>
              </div>
              {isForwarded && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" /> Chờ kết nối...
                </div>
              )}
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                /* No messages: show recommendations and system instructions */
                <div className="h-full flex flex-col justify-center items-center text-center space-y-6 max-w-md mx-auto">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 animate-bounce-slow">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white">Bắt đầu trò chuyện với AI</h4>
                    <p className="text-xs text-zinc-500">
                      Tôi có thể giúp bạn giải đáp các vấn đề về in ấn từ xa, tính giá tiền, lỗi thẻ
                      sandbox, hoặc kết nối tới con người khi cần.
                    </p>
                  </div>
                  <div className="w-full space-y-2 pt-4">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-left pl-2">
                      Gợi ý câu hỏi
                    </p>
                    <button
                      onClick={() => handleQuickQuestion('Làm thế nào để in tài liệu đen trắng?')}
                      className="w-full text-left p-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-xs rounded-xl text-zinc-300 transition-all flex items-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Làm thế nào để in tài liệu đen trắng?</span>
                    </button>
                    <button
                      onClick={() =>
                        handleQuickQuestion('Tôi bị lỗi thanh toán thẻ sandbox thì làm sao?')
                      }
                      className="w-full text-left p-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-xs rounded-xl text-zinc-300 transition-all flex items-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Tôi bị lỗi thanh toán thẻ sandbox thì làm sao?</span>
                    </button>
                    <button
                      onClick={() => handleQuickQuestion('Hãy chuyển tôi gặp hỗ trợ viên thực tế')}
                      className="w-full text-left p-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-xs rounded-xl text-zinc-300 transition-all flex items-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Hãy chuyển tôi gặp hỗ trợ viên thực tế</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Messages rendering list */
                messages.map((m: UIMessage) => {
                  // Extract text content from parts to display
                  const text = m.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => (part as { text: string }).text)
                    .join('');

                  const displayContent = text
                    .replace(/^session_id:[a-f0-9-]{36}\s*/i, '')
                    .replace('[FORWARD_TO_HUMAN]', '')
                    .trim();

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-4 max-w-[85%] ${
                        m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 border ${
                          m.role === 'user'
                            ? 'bg-zinc-900 border-zinc-800 text-indigo-400'
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
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
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-zinc-900/60 border border-zinc-900 text-zinc-200 rounded-tl-none'
                          }`}
                        >
                          {displayContent}
                        </div>
                        <span className="text-[10px] text-zinc-600 block pl-2">
                          {m.role === 'user' ? 'Bạn' : isForwarded ? 'Hỗ trợ viên' : 'AI Assistant'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Loader/Thinking animation */}
              {isLoading && (
                <div className="flex gap-4 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl rounded-tl-none text-zinc-400 text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Alert Banner if session is forwarded to human support */}
            {isForwarded && (
              <div className="bg-amber-500/10 border-y border-amber-500/20 p-3 px-6 text-xs text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
                <span>
                  <strong>Yêu cầu chuyển tiếp:</strong> AI đã kích hoạt chuyển cuộc gọi này tới hỗ
                  trợ viên con người. Hỗ trợ viên sẽ sớm phản hồi trong chatbox này.
                </span>
              </div>
            )}

            {/* Input Submission Bar */}
            <form
              onSubmit={handleSubmitForm}
              className="border-t border-zinc-900 p-4 bg-zinc-950/80 flex gap-3 z-10"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 py-3 px-4 rounded-xl text-sm focus:outline-none transition-all text-white placeholder-zinc-500"
                placeholder="Nhập nội dung tin nhắn cần hỗ trợ..."
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 bg-gradient-to-tr from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-white shadow-lg shadow-indigo-500/15 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 bg-zinc-950 text-center text-xs text-zinc-600 mt-8">
        &copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.
      </footer>
    </div>
  );
}
