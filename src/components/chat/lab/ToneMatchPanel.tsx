'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { applyToneMark, TONE_COLOR } from '@/lib/pinyinChart';
import { fetchSyllableAudio, submitToneMatch } from '@/lib/api';
import { playOnce } from '@/lib/audioPlayer';

const POOL = [
    'ma', 'mai', 'mao', 'shi', 'shou', 'shu',
    'zhi', 'zhao', 'zhong', 'chi', 'cheng', 'cha',
    'wo', 'wen', 'wan', 'ni', 'nin', 'nan',
    'hao', 'hai', 'huo', 'jia', 'jiao', 'jin',
    'qi', 'qian', 'qu', 'xue', 'xin', 'xiao',
];

interface Round {
    base: string;
    correctTone: number;
    audioUrl: string | null;
}

export function ToneMatchPanel() {
    const [round, setRound] = useState<Round | null>(null);
    const [picked, setPicked] = useState<number | null>(null);
    const [streak, setStreak] = useState(0);
    const [history, setHistory] = useState<boolean[]>([]);    // last 10
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const newRound = useCallback(async () => {
        setPicked(null);
        setError(null);
        setLoading(true);
        const base = POOL[Math.floor(Math.random() * POOL.length)];
        const correctTone = 1 + Math.floor(Math.random() * 4);    // 1..4 (skip neutral for game)
        const syllable = `${base}${correctTone}`;
        try {
            const { audio_url } = await fetchSyllableAudio(syllable);
            setRound({ base, correctTone, audioUrl: audio_url });
            playOnce(audio_url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi audio');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { newRound(); }, [newRound]);

    const replay = () => round?.audioUrl && playOnce(round.audioUrl);

    const pick = useCallback(async (t: number) => {
        if (!round || picked !== null) return;
        setPicked(t);
        const correct = t === round.correctTone;
        setStreak(s => correct ? s + 1 : 0);
        setHistory(h => [...h.slice(-9), correct]);

        try {
            await submitToneMatch({
                syllable: `${round.base}${round.correctTone}`,
                picked: t,
                correct: round.correctTone,
            });
        } catch {
            // best-effort
        }
        setTimeout(newRound, 1300);
    }, [round, picked, newRound]);

    const accuracy = history.length === 0 ? 0
        : Math.round(100 * history.filter(Boolean).length / history.length);

    return (
        <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-2">
                <Stat label="Streak" value={`${streak} 🔥`} />
                <Stat label="Độ chính xác" value={`${accuracy}%`} />
                <Stat label="Tổng" value={`${history.length}/10`} />
            </div>

            {/* Audio */}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 text-center">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                    Nghe và chọn thanh đúng
                </div>
                <button
                    onClick={replay}
                    disabled={loading || !round?.audioUrl}
                    className="w-20 h-20 rounded-full bg-[var(--primary)] text-white mx-auto flex items-center justify-center hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                    <Icon name="volume_up" size="xl" />
                </button>
                <p className="text-xs text-[var(--text-muted)] mt-3">Nhấn để nghe lại</p>
                {error && <p className="text-xs text-[var(--error)] mt-2">{error}</p>}
            </div>

            {/* 4 tone choices */}
            <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((t) => {
                    const isPicked = picked === t;
                    const isCorrect = round?.correctTone === t;
                    const showResult = picked !== null;
                    let cls = 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]';
                    if (showResult) {
                        if (isCorrect) cls = 'bg-emerald-500 text-white';
                        else if (isPicked) cls = 'bg-red-500 text-white';
                    }
                    return (
                        <button
                            key={t}
                            onClick={() => pick(t)}
                            disabled={picked !== null || loading}
                            className={`py-4 rounded-xl font-bold transition-all disabled:cursor-not-allowed ${cls}`}
                            style={!showResult ? { borderTop: `4px solid ${TONE_COLOR[t]}` } : undefined}
                        >
                            <div className="text-2xl">{round ? applyToneMark(`${round.base}${t}`) : '—'}</div>
                            <div className="text-xs opacity-80 mt-1">Thanh {t}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{label}</div>
            <div className="text-lg font-bold text-[var(--text-main)] mt-1">{value}</div>
        </div>
    );
}
