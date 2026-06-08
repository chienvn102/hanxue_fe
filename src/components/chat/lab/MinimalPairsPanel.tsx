'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { applyToneMark } from '@/lib/pinyinChart';
import { fetchMinimalPairs, fetchSyllableAudio, submitMinimalPair, type MinimalPair } from '@/lib/api';
import { playOnce } from '@/lib/audioPlayer';

export function MinimalPairsPanel() {
    const [pairs, setPairs] = useState<MinimalPair[]>([]);
    const [idx, setIdx] = useState(0);
    const [target, setTarget] = useState<'A' | 'B' | null>(null);
    const [picked, setPicked] = useState<'A' | 'B' | null>(null);
    const [feedback, setFeedback] = useState<{ correct: boolean; hint_vi: string | null; char_correct: string | null } | null>(null);
    const [streak, setStreak] = useState(0);
    const [history, setHistory] = useState<boolean[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMinimalPairs(2, 30)
            .then((p) => { setPairs(p); setLoading(false); })
            .catch((e) => { setError(e instanceof Error ? e.message : 'Lỗi tải pairs'); setLoading(false); });
    }, []);

    const current = pairs[idx];

    // Pick which side to play each round
    useEffect(() => {
        if (!current) return;
        setTarget(Math.random() < 0.5 ? 'A' : 'B');
        setPicked(null);
        setFeedback(null);
    }, [current]);

    // Lazy-resolve audio for the picked side. listMinimalPairs only returns
    // cached URLs (to avoid spawning 60 TTS subprocesses per page-load); on
    // cache miss we resolve on demand here.
    const resolveAndPlay = useCallback(async (pair: MinimalPair, side: 'A' | 'B') => {
        const syllable = side === 'A' ? pair.syllable_a : pair.syllable_b;
        const cachedUrl = side === 'A' ? pair.audio_a : pair.audio_b;
        try {
            const url = cachedUrl || (await fetchSyllableAudio(syllable)).audio_url;
            // Cache the resolved URL on the pair so replay/round doesn't re-fetch.
            if (!cachedUrl) {
                setPairs(prev => prev.map(p => p.id === pair.id
                    ? { ...p, [side === 'A' ? 'audio_a' : 'audio_b']: url }
                    : p));
            }
            playOnce(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi audio');
        }
    }, []);

    // Auto-play target on round start
    useEffect(() => {
        if (!current || !target) return;
        resolveAndPlay(current, target);
    }, [current, target, resolveAndPlay]);

    const replay = useCallback(() => {
        if (!current || !target) return;
        resolveAndPlay(current, target);
    }, [current, target, resolveAndPlay]);

    const pick = useCallback(async (side: 'A' | 'B') => {
        if (!current || !target || picked !== null) return;
        setPicked(side);
        try {
            const res = await submitMinimalPair({ pairId: current.id, picked: side, correct: target });
            setFeedback({ correct: res.correct, hint_vi: res.hint_vi, char_correct: res.char_correct });
            setStreak(s => res.correct ? s + 1 : 0);
            setHistory(h => [...h.slice(-9), res.correct]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi ghi kết quả');
        }
    }, [current, target, picked]);

    const next = useCallback(() => {
        setIdx(i => (i + 1) % Math.max(1, pairs.length));
    }, [pairs.length]);

    if (loading) return <div className="text-center py-12 text-[var(--text-muted)]">Đang tải…</div>;
    if (error) return <div className="text-center py-12 text-[var(--error)]">{error}</div>;
    if (!current) return <div className="text-center py-12 text-[var(--text-muted)]">Không có dữ liệu.</div>;

    const accuracy = history.length === 0 ? 0
        : Math.round(100 * history.filter(Boolean).length / history.length);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <Stat label="Streak" value={`${streak} 🔥`} />
                <Stat label="Độ chính xác" value={`${accuracy}%`} />
                <Stat label="Nhóm" value={current.group_label} />
            </div>

            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                    Bạn vừa nghe âm tiết nào?
                </div>
                <button
                    onClick={replay}
                    className="w-16 h-16 mx-auto rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)]"
                >
                    <Icon name="volume_up" size="lg" />
                </button>
                <p className="text-xs text-[var(--text-muted)] mt-2">Nhấn để nghe lại</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {(['A', 'B'] as const).map((side) => {
                    const syll = side === 'A' ? current.syllable_a : current.syllable_b;
                    const char = side === 'A' ? current.char_a : current.char_b;
                    let cls = 'bg-[var(--surface-secondary)] text-[var(--text-main)]';
                    if (feedback) {
                        if (side === target) cls = 'bg-emerald-500 text-white';
                        else if (side === picked) cls = 'bg-red-500 text-white';
                        else cls = 'bg-[var(--surface-secondary)] text-[var(--text-muted)] opacity-60';
                    }
                    return (
                        <button
                            key={side}
                            onClick={() => pick(side)}
                            disabled={picked !== null}
                            className={`py-6 rounded-xl border border-[var(--border)] transition-all disabled:cursor-not-allowed ${cls}`}
                        >
                            <div className="text-4xl font-bold">{char || '—'}</div>
                            <div className="text-sm font-mono mt-1">{applyToneMark(syll)}</div>
                        </button>
                    );
                })}
            </div>

            {feedback && (
                <div className={`rounded-xl border p-3 ${
                    feedback.correct
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <div className={`text-sm font-bold mb-1 ${
                        feedback.correct ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                        {feedback.correct ? '✓ Đúng rồi!' : `✗ Đáp án đúng: ${feedback.char_correct || ''}`}
                    </div>
                    {current.hint_vi && (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            💡 {current.hint_vi}
                        </p>
                    )}
                </div>
            )}

            <button
                onClick={next}
                disabled={picked === null}
                className="w-full py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-40"
            >
                Cặp tiếp →
            </button>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{label}</div>
            <div className="text-base font-bold text-[var(--text-main)] mt-1 truncate">{value}</div>
        </div>
    );
}
