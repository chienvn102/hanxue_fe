'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { fetchHskHistory, type HskExamAttempt } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';

type Filter = 'all' | 'passed' | 'failed' | 'in_progress';

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'passed', label: 'Đã đậu' },
    { value: 'failed', label: 'Chưa đậu' },
    { value: 'in_progress', label: 'Đang làm' },
];

function formatTime(seconds: number): string {
    if (!seconds || seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s === 0 ? `${m} phút` : `${m} phút ${s}s`;
}

function HistoryContent() {
    const { isAuthenticated } = useAuth();
    const [attempts, setAttempts] = useState<HskExamAttempt[]>([]);
    // Khi chưa biết auth state → coi như loading. Effect sẽ unset khi xong.
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');

    useEffect(() => {
        let cancelled = false;
        if (!isAuthenticated) {
            // Set sau microtask để không trigger cascading render trong effect body
            Promise.resolve().then(() => { if (!cancelled) setLoading(false); });
            return () => { cancelled = true; };
        }
        Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
        fetchHskHistory()
            .then(res => { if (!cancelled) setAttempts(res.data || []); })
            .catch(err => console.error('History load error:', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isAuthenticated]);

    const filtered = attempts.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'in_progress') return a.status === 'in_progress';
        if (filter === 'passed') return a.status === 'completed' && a.is_passed;
        if (filter === 'failed') return a.status === 'completed' && !a.is_passed;
        return true;
    });

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)]">Lịch sử làm bài HSK</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Xem lại các lần thi đã hoàn thành ({attempts.length})
                        </p>
                    </div>
                    <Link href="/hsk-test" className="text-sm text-[var(--primary)] hover:underline">
                        ← Danh sách đề thi
                    </Link>
                </div>

                <div className="flex gap-2 mb-6 flex-wrap">
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                filter === f.value
                                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {!isAuthenticated && (
                    <div className="text-center py-16 text-[var(--text-muted)]">
                        Bạn cần <Link href="/login" className="text-[var(--primary)] hover:underline">đăng nhập</Link> để xem lịch sử.
                    </div>
                )}

                {isAuthenticated && loading && (
                    <div className="text-center py-16 text-[var(--text-muted)]">
                        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-3" />
                        Đang tải...
                    </div>
                )}

                {isAuthenticated && !loading && filtered.length === 0 && (
                    <div className="text-center py-16 text-[var(--text-muted)]">
                        <Icon name="history" size="xl" className="mb-3" />
                        <p>{filter === 'all' ? 'Chưa có lần làm bài nào.' : 'Không có lần làm bài khớp bộ lọc.'}</p>
                    </div>
                )}

                <div className="space-y-3">
                    {filtered.map(a => {
                        const isCompleted = a.status === 'completed';
                        const target = isCompleted
                            ? `/hsk-test/result/${a.id}`
                            : `/hsk-test/${a.exam_id}`;
                        return (
                            <Link
                                key={a.id}
                                href={target}
                                className="block p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] transition-colors"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                                                HSK {a.hsk_level ?? '?'}
                                            </span>
                                            {a.status === 'in_progress' && (
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                                    Đang làm
                                                </span>
                                            )}
                                        </div>
                                        <div className="font-semibold text-[var(--text-main)] truncate">
                                            {a.title || `Bài thi #${a.exam_id}`}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">
                                            {new Date(a.completed_at || a.started_at).toLocaleString('vi-VN')}
                                            {' · '}{formatTime(a.time_spent_seconds || 0)}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {isCompleted ? (
                                            <>
                                                <div className={`text-xl font-bold ${a.is_passed ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {a.total_score}/{a.max_score}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    Đ:{a.correct_count} · S:{a.wrong_count} · –:{a.unanswered_count}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-amber-500">Tiếp tục →</div>
                                        )}
                                    </div>
                                </div>
                                {isCompleted && (
                                    <div className="flex gap-2 mt-3 text-xs flex-wrap">
                                        {a.listening_score != null && (
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded">
                                                Nghe {a.listening_score}
                                            </span>
                                        )}
                                        {a.reading_score != null && (
                                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded">
                                                Đọc {a.reading_score}
                                            </span>
                                        )}
                                        {a.writing_score != null && (
                                            <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded">
                                                Viết {a.writing_score}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function HskHistoryPage() {
    return (
        <Suspense fallback={null}>
            <HistoryContent />
        </Suspense>
    );
}
