'use client';

import { UIMessage } from '@ai-sdk/react';
import { HelpCircle, User, Sparkles, AlertCircle, Send, Clock } from 'lucide-react';
import React, { RefObject } from 'react';
import { btnInteractive, cn } from '@/lib/utils';

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
  return (
    <div className="flex-1 glass-bezel-outer flex flex-col min-h-0 h-full">
      <div className="glass-bezel-inner !p-0 flex flex-col overflow-hidden bg-zinc-950/40 relative flex-1 min-h-0 h-full">
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

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-6 max-w-md mx-auto">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 animate-pulse-slow">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-white text-base">Bắt đầu trò chuyện với AI</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tôi có thể giúp bạn giải đáp các vấn đề về in ấn từ xa, tính giá tiền, lỗi thẻ
                  sandbox, hoặc kết nối tới hỗ trợ viên thực tế khi cần.
                </p>
              </div>

              <div className="w-full space-y-2.5 pt-4">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-left pl-1">
                  Gợi ý câu hỏi hỗ trợ
                </p>
                <button
                  onClick={() => handleQuickQuestion('Làm thế nào để in tài liệu đen trắng?')}
                  className={cn(
                    'w-full text-left p-3.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-emerald-500/30 hover:pl-5 text-xs rounded-xl text-zinc-300 hover:text-white flex items-center gap-2 border-l-2 border-l-emerald-500',
                    btnInteractive,
                  )}
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Làm thế nào để in tài liệu đen trắng?</span>
                </button>
                <button
                  onClick={() =>
                    handleQuickQuestion('Tôi bị lỗi thanh toán thẻ sandbox thì làm sao?')
                  }
                  className={cn(
                    'w-full text-left p-3.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-emerald-500/30 hover:pl-5 text-xs rounded-xl text-zinc-300 hover:text-white flex items-center gap-2 border-l-2 border-l-emerald-500',
                    btnInteractive,
                  )}
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    Tôi bị lỗi thanh toán thẻ sandbox thì làm sao?
                  </span>
                </button>
                <button
                  onClick={() => handleQuickQuestion('Hãy chuyển tôi gặp hỗ trợ viên thực tế')}
                  className={cn(
                    'w-full text-left p-3.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-emerald-500/30 hover:pl-5 text-xs rounded-xl text-zinc-300 hover:text-white flex items-center gap-2 border-l-2 border-l-emerald-500',
                    btnInteractive,
                  )}
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Hãy chuyển tôi gặp hỗ trợ viên thực tế</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((m: UIMessage) => {
              const text = (m.parts || [])
                .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                .map((part) => part.text)
                .join('');

              const displayContent = text.replace('[FORWARD_TO_HUMAN]', '').trim();

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
                        ? 'bg-zinc-900 border-zinc-800 text-emerald-400'
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
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-lg shadow-emerald-950/10'
                          : 'bg-zinc-900/40 border border-zinc-900/80 backdrop-blur-md text-zinc-100 rounded-tl-none shadow-inner'
                      }`}
                    >
                      {m.role === 'user' ? (
                        displayContent
                      ) : (
                        <div className="space-y-1.5 text-zinc-200">
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
                                    <strong key={match.index} className="font-bold text-white">
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
                                      isNested ? 'ml-6 pl-1.5 text-zinc-400' : 'ml-2 text-zinc-300'
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
                                      isNested ? 'ml-6 pl-1.5 text-zinc-400' : 'ml-2 text-zinc-200'
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
                                <p key={idx} className="text-zinc-250 my-1 leading-relaxed">
                                  {formatInline(line)}
                                </p>
                              );
                            });
                          })()}
                        </div>
                      )}
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
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl rounded-tl-none text-zinc-400 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
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
              <strong>Yêu cầu chuyển tiếp:</strong> AI đã kích hoạt chuyển cuộc gọi này tới hỗ trợ
              viên con người. Hỗ trợ viên sẽ sớm phản hồi trong chatbox này.
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
            className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 py-3 px-4 rounded-xl text-sm focus:outline-none transition-all text-white placeholder-zinc-500"
            placeholder="Nhập nội dung tin nhắn cần hỗ trợ..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-3 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-white shadow-lg shadow-emerald-500/15 flex items-center justify-center hover:scale-105',
              btnInteractive,
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
