'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { RealtimeClient, mintRealtimeSession, type RealtimeStatus } from '@/lib/realtime';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface TranscriptEntry {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    done: boolean;
}

interface RealtimePanelProps {
    token: string;
    onClose: () => void;
}

export function RealtimePanel({ token, onClose }: RealtimePanelProps) {
    const [status, setStatus] = useState<RealtimeStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const clientRef = useRef<RealtimeClient | null>(null);
    const transcriptIdRef = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript area on new content
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts]);

    const handleTranscript = (role: 'user' | 'assistant', text: string, done: boolean) => {
        setTranscripts(prev => {
            // Find the LAST entry with this role that's still streaming (not done).
            // For user: this hits the placeholder we reserved on speech_started.
            // For assistant: this hits the current AI message being streamed.
            for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].role === role && !prev[i].done) {
                    const updated = [...prev];
                    updated[i] = {
                        ...updated[i],
                        text: done ? text : updated[i].text + text,
                        done,
                    };
                    return updated;
                }
            }
            // No matching open slot — append a fresh entry (rare fallback)
            transcriptIdRef.current += 1;
            return [...prev, { id: transcriptIdRef.current, role, text, done }];
        });
    };

    const handleUserSpeechStarted = () => {
        // Reserve a placeholder user bubble immediately so it appears BEFORE
        // any AI reply (which often starts streaming before Whisper finalises).
        setTranscripts(prev => {
            // Avoid duplicate placeholders if multiple speech_started fire in a row
            const last = prev[prev.length - 1];
            if (last && last.role === 'user' && !last.done && last.text === '') return prev;
            transcriptIdRef.current += 1;
            return [...prev, { id: transcriptIdRef.current, role: 'user', text: '', done: false }];
        });
    };

    const start = async () => {
        setError(null);
        setStatus('connecting');
        try {
            const session = await mintRealtimeSession(API_BASE, token);
            const client = new RealtimeClient();
            client.onTranscript = handleTranscript;
            client.onUserSpeechStarted = handleUserSpeechStarted;
            client.onStatus = setStatus;
            client.onError = (e) => setError(e.message);
            clientRef.current = client;
            await client.connect(session.clientSecret, session.model);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Không kết nối được phiên thoại';
            setError(msg);
            setStatus('error');
        }
    };

    const stop = async () => {
        if (clientRef.current) {
            await clientRef.current.disconnect();
            clientRef.current = null;
        }
        setStatus('closed');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clientRef.current?.disconnect();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                            <Icon name="record_voice_over" className="text-[var(--primary)]" />
                            Thoại realtime với AI
                        </h2>
                        {/*
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Powered by OpenAI Realtime — phản hồi &lt; 1 giây, ngắt lời được
                        </p>
                        */}
                    </div>
                    <button
                        onClick={async () => { await stop(); onClose(); }}
                        className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        aria-label="Đóng"
                    >
                        <Icon name="close" />
                    </button>
                </div>

                {/* Status badge */}
                <div className="px-5 py-3 border-b border-[var(--border)]">
                    <StatusBadge status={status} error={error} />
                </div>

                {/* Transcript */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 min-h-[200px] max-h-[400px]">
                    {transcripts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)]">
                            <Icon name="mic" size="xl" className="mb-3" />
                            {status === 'idle' ? (
                                <p>Bấm <span className="font-semibold text-[var(--primary)]">Bắt đầu</span> để khởi tạo phiên thoại.</p>
                            ) : status === 'connecting' ? (
                                <p>Đang kết nối...</p>
                            ) : status === 'connected' ? (
                                <p>Hãy thử nói gì đó — AI đang lắng nghe.</p>
                            ) : (
                                <p>Phiên đã kết thúc.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transcripts.map(t => (
                                <div key={t.id} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                                        t.role === 'user'
                                            ? 'bg-[var(--primary)] text-white'
                                            : 'bg-[var(--surface-secondary)] text-[var(--text-main)]'
                                    }`}>
                                        <p className="text-xs uppercase tracking-wide opacity-70 mb-0.5">
                                            {t.role === 'user' ? 'Bạn' : 'AI'}
                                            {!t.done && <span className="ml-1 animate-pulse">·</span>}
                                        </p>
                                        <p className="hanzi text-sm leading-relaxed">
                                            {t.text || (t.role === 'user' && !t.done
                                                ? <span className="opacity-60 italic text-xs not-italic">Đang nghe…</span>
                                                : '…')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-center gap-3">
                    {status === 'idle' || status === 'closed' || status === 'error' ? (
                        <Button onClick={start}>
                            <Icon name="play_arrow" size="sm" />
                            Bắt đầu thoại
                        </Button>
                    ) : status === 'connecting' ? (
                        <Button disabled>
                            <Icon name="hourglass_top" size="sm" />
                            Đang kết nối...
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={stop}>
                            <Icon name="stop" size="sm" />
                            Kết thúc thoại
                        </Button>
                    )}
                </div>

                {/*
                <div className="px-5 pb-4 text-xs text-[var(--text-muted)] text-center">
                    Cần micro và HTTPS. Có thể ngắt lời AI bất cứ lúc nào.
                </div>
                */}
            </div>
        </div>
    );
}

function StatusBadge({ status, error }: { status: RealtimeStatus; error: string | null }) {
    if (error) {
        return (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <Icon name="error" size="sm" />
                <span>{error}</span>
            </div>
        );
    }
    const labels: Record<RealtimeStatus, { icon: string; text: string; color: string }> = {
        idle:       { icon: 'radio_button_unchecked', text: 'Sẵn sàng',     color: 'text-[var(--text-muted)]' },
        connecting: { icon: 'hourglass_top',          text: 'Đang kết nối', color: 'text-amber-500' },
        connected:  { icon: 'sensors',                text: 'Đã kết nối',   color: 'text-emerald-500' },
        closed:     { icon: 'pause_circle',           text: 'Đã đóng',       color: 'text-[var(--text-muted)]' },
        error:      { icon: 'error',                  text: 'Lỗi',          color: 'text-red-500' },
    };
    const s = labels[status];
    return (
        <div className={`flex items-center gap-2 text-sm ${s.color}`}>
            <Icon name={s.icon} size="sm" />
            <span>{s.text}</span>
        </div>
    );
}
