'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { fetchDueVocabs, submitReview, type VocabWithProgress } from '@/lib/api';

type Stage = 'show_zh' | 'show_meaning';

// Map nút tự đánh giá → quality 0-5 cho SM-2.
// Anki-style 4 nút nhưng chiếu sang SM-2 quality để dùng `submitReview` hiện có.
const RATINGS = [
    { key: 'again', label: 'Quên (1d)', quality: 1, color: 'red' },
    { key: 'hard',  label: 'Khó',       quality: 3, color: 'amber' },
    { key: 'good',  label: 'Tốt',       quality: 4, color: 'sky' },
    { key: 'easy',  label: 'Dễ',        quality: 5, color: 'emerald' },
] as const;

function SrsContent() {
    const params = useSearchParams();
    const router = useRouter();

    const hsk = params.get('hsk');
    const limit = parseInt(params.get('limit') || '20');

    const [queue, setQueue] = useState<VocabWithProgress[]>([]);
    const [idx, setIdx] = useState(0);
    const [stage, setStage] = useState<Stage>('show_zh');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [stats, setStats] = useState({ reviewed: 0, again: 0 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p: { limit: number; hsk?: number } = { limit };
            if (hsk) p.hsk = parseInt(hsk);
            const res = await fetchDueVocabs(p);
            setQueue(res.data || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi tải từ');
        } finally {
            setLoading(false);
        }
    }, [hsk, limit]);

    useEffect(() => { load(); }, [load]);

    const current = queue[idx];

    const handleRating = async (quality: number) => {
        if (!current) return;
        setSubmitting(true);
        try {
            await submitReview(current.id, quality);
            setStats(s => ({
                reviewed: s.reviewed + 1,
                again: s.again + (quality < 3 ? 1 : 0),
            }));
            if (idx + 1 >= queue.length) {
                setDone(true);
            } else {
                setIdx(i => i + 1);
                setStage('show_zh');
            }
        } catch (e) {
            console.error('submit review failed', e);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex items-center justify-center" role="status" aria-busy="true">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
                    <span className="sr-only">Đang tải từ ôn tập...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                    <Icon name="error" size="xl" className="text-red-500 mb-2" />
                    <p className="text-[var(--text-secondary)]">{error}</p>
                    <Link href="/practice" className="text-[var(--primary)] hover:underline">← Quay lại</Link>
                </div>
            </div>
        );
    }

    if (queue.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-16 text-center">
                    <Icon name="check_circle" size="xl" className="text-emerald-500 mb-3" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Không có từ nào tới hạn ôn</h1>
                    <p className="text-[var(--text-secondary)] mb-6">
                        Quay lại sau khi hệ thống lên lịch ôn tiếp, hoặc học từ mới qua game khác.
                    </p>
                    <Link href="/practice">
                        <Button>← Về trang Luyện tập</Button>
                    </Link>
                </main>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-16 text-center">
                    <Icon name="celebration" size="xl" className="text-emerald-500 mb-3" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Đã ôn xong {stats.reviewed} từ</h1>
                    <p className="text-[var(--text-secondary)] mb-1">
                        {stats.again} từ bạn đánh dấu là quên — sẽ xuất hiện lại trong 1 ngày.
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mb-6">
                        Hệ thống đã cập nhật lịch ôn tiếp dựa trên SM-2.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link href="/practice"><Button variant="ghost">← Về Luyện tập</Button></Link>
                        <Button onClick={() => { setIdx(0); setDone(false); setStage('show_zh'); load(); }}>
                            Ôn tiếp
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
                {/* Progress */}
                <div className="flex items-center justify-between mb-6">
                    <Link href="/practice" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)]">
                        ← Thoát
                    </Link>
                    <span className="text-sm text-[var(--text-muted)]">
                        {idx + 1}/{queue.length}
                    </span>
                </div>
                <div className="h-1 bg-[var(--border)] rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-[var(--primary)] transition-all"
                        style={{ width: `${((idx + 1) / queue.length) * 100}%` }}
                    />
                </div>

                {/* Card */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 sm:p-12 text-center min-h-[280px] flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        HSK {current.hskLevel}
                    </span>
                    <p className="hanzi text-5xl sm:text-6xl font-bold text-[var(--text-main)] mb-3">
                        {current.simplified}
                    </p>
                    {stage === 'show_meaning' ? (
                        <>
                            <p className="text-xl text-[var(--primary)] mb-2">{current.pinyin}</p>
                            <p className="text-lg text-[var(--text-secondary)]">{current.meaningVi}</p>
                            {current.meaningEn && (
                                <p className="text-sm italic text-[var(--text-muted)] mt-1">{current.meaningEn}</p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-[var(--text-muted)] italic mt-4">
                            Tự nhớ nghĩa, sau đó bấm "Hiện đáp án".
                        </p>
                    )}
                </div>

                {/* Action */}
                <div className="mt-6">
                    {stage === 'show_zh' ? (
                        <Button onClick={() => setStage('show_meaning')} fullWidth size="lg">
                            Hiện đáp án
                            <Icon name="visibility" size="sm" className="ml-2" />
                        </Button>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {RATINGS.map(r => (
                                <button
                                    key={r.key}
                                    onClick={() => handleRating(r.quality)}
                                    disabled={submitting}
                                    className={`px-3 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
                                        r.color === 'red'     ? 'border-red-500/40     text-red-500     hover:bg-red-500/10'     :
                                        r.color === 'amber'   ? 'border-amber-500/40   text-amber-500   hover:bg-amber-500/10'   :
                                        r.color === 'sky'     ? 'border-sky-500/40     text-sky-500     hover:bg-sky-500/10'     :
                                                                'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function PracticeSrsPage() {
    return (
        <Suspense fallback={null}>
            <SrsContent />
        </Suspense>
    );
}
