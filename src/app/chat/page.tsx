'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { sendChatMessage, fetchChatUsage, playAudio } from '@/lib/api';
import Link from 'next/link';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const SUGGESTION_CHIPS = [
    '你好 nghĩa là gì?',
    'Phân biệt 的/得/地',
    'Cách dùng 了',
    'Đặt câu với 因为...所以',
    'Từ vựng chủ đề ăn uống',
];

export default function ChatPage() {
    const { user, isAuthenticated } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [usageLimit, setUsageLimit] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mode] = useState<'chat' | 'conversation'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const sendingRef = useRef(false);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Load usage on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        fetchChatUsage()
            .then(usage => {
                setRemaining(usage.limit - usage.used);
                setUsageLimit(usage.limit);
            })
            .catch((err) => {
                const msg = err instanceof Error ? err.message : '';
                if (msg === 'Unauthorized') {
                    setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                } else {
                    // Fallback: allow chatting but show unknown usage
                    setRemaining(-1);
                }
            });
    }, [isAuthenticated]);

    // Auto-resize textarea
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }, []);

    const sendMessage = useCallback(async (text?: string) => {
        const messageText = (text || input).trim();
        if (!messageText || sendingRef.current) return;
        sendingRef.current = true;

        setError(null);
        setInput('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }

        const userMessage: Message = { role: 'user', content: messageText };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const history = newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
            const result = await sendChatMessage(messageText, mode, history);
            setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
            setRemaining(result.remaining);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi gửi tin nhắn';
            if (msg === 'Unauthorized') {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            } else {
                setError(msg);
            }
        } finally {
            sendingRef.current = false;
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }, [input, messages, mode]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    // TTS for Chinese text
    const speakChinese = useCallback((text: string) => {
        // Extract Chinese characters from text
        const chineseMatch = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]+/g);
        if (chineseMatch) {
            playAudio(chineseMatch.join(''));
        }
    }, []);

    // Guest view
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <main className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                            <Icon name="smart_toy" size="xl" className="text-[var(--primary)]" />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-3">Học cùng AI</h1>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Đăng nhập để trò chuyện với gia sư AI và luyện tập tiếng Trung mỗi ngày.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-xl transition-colors"
                        >
                            <Icon name="login" size="sm" />
                            Đăng nhập
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 py-4">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                            <Icon name="smart_toy" className="text-[var(--primary)]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-[var(--text-main)]">
                                Học cùng AI
                            </h1>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Gia sư 小明 (Xiǎo Míng) &middot; HSK {user?.targetHsk || 1}
                            </p>
                        </div>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)]">
                        <button
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white transition-colors"
                        >
                            <Icon name="chat" size="xs" className="mr-1 align-middle" />
                            Chat
                        </button>
                        <button
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--text-muted)] cursor-not-allowed transition-colors"
                            title="Sắp ra mắt"
                            disabled
                        >
                            <Icon name="mic" size="xs" className="mr-1 align-middle" />
                            Hội thoại
                        </button>
                    </div>
                </div>

                {/* Usage Counter */}
                {remaining !== null && usageLimit !== null && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs">
                        <Icon name="bolt" size="xs" className="text-amber-500" />
                        <span className="text-[var(--text-secondary)]">
                            Còn <span className="font-bold text-[var(--text-main)]">{remaining}</span>/{usageLimit} lượt hôm nay
                        </span>
                        {remaining <= 3 && remaining > 0 && (
                            <span className="ml-auto text-amber-500 font-medium">Sắp hết!</span>
                        )}
                        {remaining === 0 && (
                            <span className="ml-auto text-[var(--error)] font-medium">Đã hết lượt</span>
                        )}
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-4 min-h-[300px] max-h-[calc(100vh-320px)]">
                    {/* Empty State */}
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="w-16 h-16 mb-4 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                                <Icon name="waving_hand" size="lg" className="text-[var(--primary)]" />
                            </div>
                            <h2 className="text-lg font-bold text-[var(--text-main)] mb-2">
                                Xin chào! Mình là 小明
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
                                Hỏi mình bất cứ điều gì về tiếng Trung nhé! Ngữ pháp, từ vựng, cách phát âm...
                            </p>

                            {/* Suggestion Chips */}
                            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                                {SUGGESTION_CHIPS.map((chip) => (
                                    <button
                                        key={chip}
                                        onClick={() => sendMessage(chip)}
                                        className="px-3 py-2 text-xs font-medium rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            {/* Notice */}
                            <p className="mt-6 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <Icon name="info" size="xs" />
                                Lịch sử chat sẽ mất khi tải lại trang
                            </p>
                        </div>
                    )}

                    {/* Message List */}
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-3 mb-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                msg.role === 'user'
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-emerald-500/10 text-emerald-600'
                            }`}>
                                {msg.role === 'user'
                                    ? (user?.displayName || '?').charAt(0).toUpperCase()
                                    : '明'
                                }
                            </div>

                            {/* Bubble */}
                            <div className={`relative max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                    ? 'bg-[var(--primary)] text-white rounded-br-md'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-main)] border border-[var(--border)] rounded-bl-md'
                            }`}>
                                {msg.content}

                                {/* TTS button for assistant messages */}
                                {msg.role === 'assistant' && /[\u4e00-\u9fff]/.test(msg.content) && (
                                    <button
                                        onClick={() => speakChinese(msg.content)}
                                        className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                                        title="Nghe phát âm"
                                    >
                                        <Icon name="volume_up" size="xs" />
                                        Nghe
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex gap-3 mb-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-sm font-bold">
                                明
                            </div>
                            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--surface-secondary)] border border-[var(--border)]">
                                <div className="flex gap-1.5 items-center h-5">
                                    <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 text-sm text-[var(--error)]">
                            <Icon name="error" size="sm" />
                            {error}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex items-end gap-2 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] focus-within:border-[var(--primary)]/50 transition-colors">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={remaining === 0 ? 'Đã hết lượt chat hôm nay...' : 'Hỏi về tiếng Trung...'}
                        disabled={isLoading || remaining === 0}
                        rows={1}
                        className="flex-1 resize-none bg-transparent text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none max-h-[120px] py-1.5 disabled:opacity-50"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isLoading || remaining === 0}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                        title="Gửi (Enter)"
                    >
                        <Icon name={isLoading ? 'hourglass_top' : 'send'} size="sm" />
                    </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-center mt-2 text-[10px] text-[var(--text-muted)]">
                    Enter để gửi &middot; Shift+Enter xuống dòng
                </p>
            </main>

            <Footer />
        </div>
    );
}
