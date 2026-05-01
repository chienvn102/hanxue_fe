'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { sendChatMessage, fetchChatUsage, playAudio, transcribeAudio, synthesizeSpeech } from '@/lib/api';
import { isRecordingSupported, requestMicPermission, startRecording } from '@/lib/audioRecorder';
import PracticePanel from '@/components/PracticePanel';
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

const CONVERSATION_CHIPS = [
    '你好，你叫什么名字？',
    '今天天气怎么样？',
    '你喜欢吃什么？',
    '我想学中文',
];

// Tutor config per mode
const TUTOR = {
    chat: { name: '小明', pinyin: 'Xiǎo Míng', avatar: '明', color: 'bg-emerald-500/10 text-emerald-600' },
    conversation: { name: '小红', pinyin: 'Xiǎo Hóng', avatar: '红', color: 'bg-rose-500/10 text-rose-600' },
    practice: { name: '老师', pinyin: 'Lǎo shī', avatar: '师', color: 'bg-blue-500/10 text-blue-600' },
} as const;

export default function ChatPage() {
    const { user, isAuthenticated, logout } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [usageLimit, setUsageLimit] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'chat' | 'conversation' | 'practice'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const sendingRef = useRef(false);

    // --- Conversation mode state ---
    const [sttSupported, setSttSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recorderRef = useRef<{ stop: () => Promise<Blob>; cancel: () => void } | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

    const tutor = TUTOR[mode];

    // Check STT support on mount (client only)
    useEffect(() => {
        setSttSupported(isRecordingSupported());
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, transcript]);

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
                    logout();
                } else {
                    setRemaining(-1);
                }
            });
    }, [isAuthenticated, logout]);

    // Helper: stop TTS audio and revoke URL to prevent leak
    const stopTtsAudio = useCallback(() => {
        if (ttsAudioRef.current) {
            const audio = ttsAudioRef.current;
            audio.pause();
            if (audio.src) URL.revokeObjectURL(audio.src);
            ttsAudioRef.current = null;
        }
        setIsSpeaking(false);
    }, []);

    // Cleanup on unmount or mode change
    useEffect(() => {
        return () => {
            recorderRef.current?.cancel();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            stopTtsAudio();
        };
    }, [mode, stopTtsAudio]);

    // --- TTS via BE Azure Speech ---
    const speakReply = useCallback(async (text: string) => {
        const chineseMatch = text.match(/[一-鿿㐀-䶿，。？！]+/g);
        if (!chineseMatch) return;
        const chineseText = chineseMatch.join('');

        try {
            setIsSpeaking(true);
            const audioBlob = await synthesizeSpeech(chineseText);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            ttsAudioRef.current = audio;
            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                ttsAudioRef.current = null;
            };
            audio.onerror = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                ttsAudioRef.current = null;
            };
            await audio.play();
        } catch {
            setIsSpeaking(false);
            // Fallback: browser TTS
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(chineseText);
                utterance.lang = 'zh-CN';
                utterance.rate = 0.85;
                utterance.onend = () => setIsSpeaking(false);
                utterance.onerror = () => setIsSpeaking(false);
                speechSynthesis.speak(utterance);
            }
        }
    }, []);

    // --- Auto-resize textarea ---
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }, []);

    // --- Send message ---
    const sendMessage = useCallback(async (text?: string) => {
        const messageText = (text || input).trim();
        if (!messageText || sendingRef.current) return;

        // Practice mode doesn't use sendChatMessage
        if (mode === 'practice') return;

        sendingRef.current = true;

        setError(null);
        setInput('');
        setTranscript('');
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
            const reply = result.reply;
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            setRemaining(result.remaining);

            // Auto-TTS in conversation mode
            if (mode === 'conversation') {
                speakReply(reply);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi gửi tin nhắn';
            if (msg === 'Unauthorized') {
                logout();
            } else {
                setError(msg);
            }
        } finally {
            sendingRef.current = false;
            setIsLoading(false);
            if (mode === 'chat') inputRef.current?.focus();
        }
    }, [input, messages, mode, speakReply, logout]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    // --- Recording (MediaRecorder → BE transcribe) ---
    const processRecording = useCallback(async (audioBlob: Blob) => {
        if (audioBlob.size === 0) return;
        setIsTranscribing(true);
        setTranscript('Đang nhận diện...');
        try {
            const result = await transcribeAudio(audioBlob);
            if (result.text.trim()) {
                setTranscript(result.text);
                // 2s delay then auto-send
                silenceTimerRef.current = setTimeout(() => {
                    sendMessage(result.text.trim());
                    setTranscript('');
                    silenceTimerRef.current = null;
                }, 2000);
            } else {
                setTranscript('');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi nhận diện giọng nói';
            if (msg === 'Unauthorized') {
                logout();
            } else {
                setError(msg);
            }
            setTranscript('');
        } finally {
            setIsTranscribing(false);
        }
    }, [sendMessage, logout]);

    const startListening = useCallback(async () => {
        if (!sttSupported || isLoading || remaining === 0) return;

        stopTtsAudio();
        setTranscript('');
        setError(null);

        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        const hasPermission = await requestMicPermission();
        if (!hasPermission) {
            setError('Trình duyệt chưa cấp quyền microphone. Vui lòng cho phép trong cài đặt.');
            return;
        }

        try {
            const recorder = await startRecording();
            recorderRef.current = recorder;
            setIsListening(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi microphone';
            setError(msg);
        }
    }, [sttSupported, isLoading, remaining, stopTtsAudio]);

    const stopListening = useCallback(async () => {
        if (recorderRef.current) {
            setIsListening(false);
            try {
                const audioBlob = await recorderRef.current.stop();
                recorderRef.current = null;
                processRecording(audioBlob);
            } catch (err) {
                recorderRef.current = null;
                const msg = err instanceof Error ? err.message : 'Lỗi xử lý audio';
                setError(msg);
            }
        }
    }, [processRecording]);

    const cancelListening = useCallback(() => {
        if (recorderRef.current) {
            recorderRef.current.cancel();
            recorderRef.current = null;
            setIsListening(false);
            setTranscript('');
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
            setTranscript('');
        }
    }, []);

    // --- Mode switch ---
    const switchMode = useCallback((newMode: 'chat' | 'conversation' | 'practice') => {
        if (newMode === mode) return;
        if (newMode === 'conversation' && !sttSupported) return;
        recorderRef.current?.cancel();
        stopTtsAudio();
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        setIsListening(false);
        setIsSpeaking(false);
        setIsTranscribing(false);
        setTranscript('');
        setMode(newMode);
    }, [mode, sttSupported, stopTtsAudio]);

    // --- Guest view ---
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

    const chips = mode === 'chat' ? SUGGESTION_CHIPS : CONVERSATION_CHIPS;
    const isInputDisabled = isLoading || remaining === 0 || isSpeaking;

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
                                {mode === 'chat'
                                    ? `Gia sư ${tutor.name} (${tutor.pinyin})`
                                    : mode === 'conversation'
                                        ? `Bạn trò chuyện ${tutor.name} (${tutor.pinyin})`
                                        : `Giáo viên ${tutor.name} (${tutor.pinyin})`
                                } &middot; HSK {user?.targetHsk || 1}
                            </p>
                        </div>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)]">
                        <button
                            onClick={() => switchMode('chat')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                mode === 'chat'
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface)]'
                            }`}
                        >
                            <Icon name="chat" size="xs" className="mr-1 align-middle" />
                            Chat
                        </button>
                        <button
                            onClick={() => switchMode('conversation')}
                            disabled={!sttSupported}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                mode === 'conversation'
                                    ? 'bg-[var(--primary)] text-white'
                                    : sttSupported
                                        ? 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface)]'
                                        : 'text-[var(--text-muted)] cursor-not-allowed'
                            }`}
                            title={!sttSupported ? 'Trình duyệt không hỗ trợ nhận diện giọng nói' : ''}
                        >
                            <Icon name="mic" size="xs" className="mr-1 align-middle" />
                            Hội thoại
                        </button>
                        <button
                            onClick={() => switchMode('practice')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                mode === 'practice'
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface)]'
                            }`}
                        >
                            <Icon name="record_voice_over" size="xs" className="mr-1 align-middle" />
                            Luyện phát âm
                        </button>
                    </div>
                </div>

                {/* Usage Counter — only for chat/conversation; practice has its own quota display */}
                {mode !== 'practice' && remaining !== null && usageLimit !== null && (
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

                {/* Practice Mode — full panel, no chat shell */}
                {mode === 'practice' ? (
                    <div className="flex-1 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-4 min-h-[300px]">
                        <PracticePanel
                            hskLevel={user?.targetHsk || 1}
                            onPracticeComplete={(result) => {
                                // eslint-disable-next-line no-console
                                console.log('Practice completed:', result);
                            }}
                        />
                    </div>
                ) : (
                    <>
                        {/* Messages Area — chat & conversation only */}
                        <div className="flex-1 overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-4 min-h-[300px] max-h-[calc(100vh-320px)]">
                            {messages.length === 0 && !isLoading && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className={`w-16 h-16 mb-4 rounded-full ${tutor.color} flex items-center justify-center`}>
                                        {mode === 'chat'
                                            ? <Icon name="waving_hand" size="lg" className="text-[var(--primary)]" />
                                            : <Icon name="record_voice_over" size="lg" className="text-rose-500" />
                                        }
                                    </div>
                                    <h2 className="text-lg font-bold text-[var(--text-main)] mb-2">
                                        Xin chào! Mình là {tutor.name}
                                    </h2>
                                    <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
                                        {mode === 'chat'
                                            ? 'Hỏi mình bất cứ điều gì về tiếng Trung nhé! Ngữ pháp, từ vựng, cách phát âm...'
                                            : 'Nhấn mic và nói tiếng Trung để luyện hội thoại. Mình sẽ trả lời và sửa lỗi cho bạn!'
                                        }
                                    </p>

                                    <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                                        {chips.map((chip) => (
                                            <button
                                                key={chip}
                                                onClick={() => sendMessage(chip)}
                                                className="px-3 py-2 text-xs font-medium rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all"
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>

                                    <p className="mt-6 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                        <Icon name="info" size="xs" />
                                        Lịch sử chat sẽ mất khi tải lại trang
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex gap-3 mb-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        msg.role === 'user'
                                            ? 'bg-[var(--primary)] text-white'
                                            : tutor.color
                                    }`}>
                                        {msg.role === 'user'
                                            ? (user?.displayName || '?').charAt(0).toUpperCase()
                                            : tutor.avatar
                                        }
                                    </div>

                                    <div className={`relative max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                        msg.role === 'user'
                                            ? 'bg-[var(--primary)] text-white rounded-br-md'
                                            : 'bg-[var(--surface-secondary)] text-[var(--text-main)] border border-[var(--border)] rounded-bl-md'
                                    }`}>
                                        {msg.content}

                                        {/* TTS only — pronunciation practice now lives in Practice tab */}
                                        {msg.role === 'assistant' && /[一-鿿]/.test(msg.content) && (
                                            <div className="mt-2 flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        const zh = msg.content.match(/[一-鿿㐀-䶿，。？！]+/g);
                                                        if (!zh) return;
                                                        if (mode === 'conversation') {
                                                            speakReply(msg.content);
                                                        } else {
                                                            playAudio(zh.join(''));
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                                                    title="Nghe phát âm"
                                                >
                                                    <Icon name="volume_up" size="xs" />
                                                    Nghe
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-3 mb-4">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${tutor.color} flex items-center justify-center text-sm font-bold`}>
                                        {tutor.avatar}
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

                            {error && (
                                <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 text-sm text-[var(--error)]">
                                    <Icon name="error" size="sm" />
                                    {error}
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area — Chat Mode */}
                        {mode === 'chat' && (
                            <>
                                <div className="flex items-end gap-2 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] focus-within:border-[var(--primary)]/50 transition-colors">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder={remaining === 0 ? 'Đã hết lượt chat hôm nay...' : 'Hỏi về tiếng Trung...'}
                                        disabled={isInputDisabled}
                                        rows={1}
                                        className="flex-1 resize-none bg-transparent text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none max-h-[120px] py-1.5 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={() => sendMessage()}
                                        disabled={!input.trim() || isInputDisabled}
                                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                        title="Gửi (Enter)"
                                    >
                                        <Icon name={isLoading ? 'hourglass_top' : 'send'} size="sm" />
                                    </button>
                                </div>
                                <p className="text-center mt-2 text-[10px] text-[var(--text-muted)]">
                                    Enter để gửi &middot; Shift+Enter xuống dòng
                                </p>
                            </>
                        )}

                        {/* Input Area — Conversation Mode */}
                        {mode === 'conversation' && (
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                                {(transcript || isTranscribing) && (
                                    <div className={`w-full px-4 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-sm text-center min-h-[36px] ${isTranscribing ? 'text-[var(--text-muted)] animate-pulse' : 'text-[var(--text-main)]'}`}>
                                        {transcript || 'Đang nhận diện...'}
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    {isListening && (
                                        <button
                                            onClick={cancelListening}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--error)] hover:border-[var(--error)]/30 transition-colors"
                                            title="Hủy"
                                        >
                                            <Icon name="close" size="sm" />
                                        </button>
                                    )}

                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        disabled={isInputDisabled}
                                        className={`relative w-16 h-16 flex items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                            isListening
                                                ? 'bg-[var(--error)] text-white shadow-lg shadow-[var(--error)]/30'
                                                : isSpeaking
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md'
                                        }`}
                                        title={isListening ? 'Nhấn để gửi' : isSpeaking ? `${tutor.name} đang nói...` : 'Nhấn để nói'}
                                    >
                                        <Icon
                                            name={isListening ? 'stop' : isSpeaking ? 'volume_up' : isLoading ? 'hourglass_top' : 'mic'}
                                            size="lg"
                                        />
                                        {isListening && (
                                            <span className="absolute inset-0 rounded-full border-2 border-[var(--error)] animate-ping opacity-50" />
                                        )}
                                    </button>

                                    {isListening && transcript && (
                                        <button
                                            onClick={stopListening}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                                            title="Gửi"
                                        >
                                            <Icon name="send" size="sm" />
                                        </button>
                                    )}
                                </div>

                                <p className="text-xs text-[var(--text-muted)]">
                                    {isListening
                                        ? 'Đang nghe... nhấn để gửi'
                                        : isSpeaking
                                            ? `${tutor.name} đang trả lời...`
                                            : isLoading
                                                ? 'Đang xử lý...'
                                                : remaining === 0
                                                    ? 'Đã hết lượt hôm nay'
                                                    : 'Nhấn mic và nói tiếng Trung'
                                    }
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}
