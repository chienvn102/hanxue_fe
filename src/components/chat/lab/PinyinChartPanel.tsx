'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { applyToneMark, buildSyllable, TONE_COLOR } from '@/lib/pinyinChart';
import { fetchPinyinChart, fetchSyllableAudio, type PinyinChartData } from '@/lib/api';
import { playOnce } from '@/lib/audioPlayer';

export function PinyinChartPanel() {
    const [chart, setChart] = useState<PinyinChartData | null>(null);
    const [tone, setTone] = useState(1);
    const [loading, setLoading] = useState(true);
    const [activeCell, setActiveCell] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPinyinChart()
            .then((d) => { setChart(d); setLoading(false); })
            .catch((e) => { setError(e instanceof Error ? e.message : 'Lỗi tải chart'); setLoading(false); });
    }, []);

    const playCell = useCallback(async (initial: string, final: string) => {
        const syll = buildSyllable(initial, final, tone);
        setActiveCell(syll);
        try {
            const { audio_url } = await fetchSyllableAudio(syll);
            playOnce(audio_url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi audio');
        } finally {
            setTimeout(() => setActiveCell(prev => prev === syll ? null : prev), 600);
        }
    }, [tone]);

    if (loading) return <div className="text-center py-12 text-[var(--text-muted)]">Đang tải…</div>;
    if (error || !chart) return <div className="text-center py-12 text-[var(--error)]">{error || 'Lỗi'}</div>;

    return (
        <div className="space-y-3">
            {/* Tone selector */}
            <div className="grid grid-cols-5 gap-1.5 sticky top-0 z-10 bg-[var(--background)] pb-2">
                {[1, 2, 3, 4, 5].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`py-2 rounded-md text-sm font-bold transition-all ${
                            tone === t ? 'text-white shadow-md' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                        }`}
                        style={tone === t ? { background: TONE_COLOR[t] } : undefined}
                    >
                        Thanh {t}
                    </button>
                ))}
            </div>

            <p className="text-xs text-[var(--text-muted)]">
                Bấm vào ô để nghe phát âm. ∅ = không có phụ âm đầu (vd ān, ér).
            </p>

            {/* Chart — wrap horizontally scrollable */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-10 bg-[var(--surface-secondary)] border border-[var(--border)] p-1 text-[10px] text-[var(--text-muted)]">
                                init \\ final
                            </th>
                            {chart.finals.map((f) => (
                                <th
                                    key={f}
                                    className="bg-[var(--surface-secondary)] border border-[var(--border)] p-1 text-[10px] font-mono text-[var(--text-secondary)] min-w-[42px]"
                                >
                                    {f}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {chart.initials.map((initial) => {
                            const validFinals = new Set(chart.valid[initial] || []);
                            return (
                                <tr key={initial}>
                                    <th className="sticky left-0 z-10 bg-[var(--surface-secondary)] border border-[var(--border)] p-1 text-[10px] font-mono text-[var(--text-secondary)] min-w-[36px]">
                                        {initial}
                                    </th>
                                    {chart.finals.map((final) => {
                                        if (!validFinals.has(final)) {
                                            return <td key={final} className="border border-[var(--border)] bg-[var(--background)]" />;
                                        }
                                        const syll = buildSyllable(initial, final, tone);
                                        const isActive = activeCell === syll;
                                        return (
                                            <td key={final} className="border border-[var(--border)] p-0">
                                                <button
                                                    onClick={() => playCell(initial, final)}
                                                    className={`w-full h-full px-1 py-1.5 text-[11px] font-mono transition-colors ${
                                                        isActive
                                                            ? 'bg-[var(--primary)] text-white'
                                                            : 'text-[var(--text-main)] hover:bg-[var(--primary)]/10'
                                                    }`}
                                                    title={syll}
                                                >
                                                    {applyToneMark(syll)}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
