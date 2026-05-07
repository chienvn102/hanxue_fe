'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';
import { useAuth } from '@/components/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RankEntry {
    rank: number;
    id: number;
    displayName: string;
    avatarUrl: string | null;
    targetHsk: number | null;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    totalStudyDays: number;
    isMe: boolean;
}

interface LeaderboardResponse {
    success: boolean;
    data: {
        period: 'all' | 'week' | 'month';
        periodIsFallback: boolean;
        ranking: RankEntry[];
        me: RankEntry | null;
    };
}

type Period = 'all' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
    all: 'Tất cả',
    week: 'Tuần',
    month: 'Tháng',
};

const HSK_OPTS = [
    { value: '', label: 'Tất cả' },
    { value: '1', label: 'HSK 1' },
    { value: '2', label: 'HSK 2' },
    { value: '3', label: 'HSK 3' },
    { value: '4', label: 'HSK 4' },
    { value: '5', label: 'HSK 5' },
    { value: '6', label: 'HSK 6' },
];

export default function LeaderboardPage() {
    const { isAuthenticated } = useAuth();
    const [period, setPeriod] = useState<Period>('all');
    const [hsk, setHsk] = useState('');
    const [data, setData] = useState<LeaderboardResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            params.set('period', period);
            if (hsk) params.set('hsk', hsk);
            params.set('limit', '50');

            const token = typeof window !== 'undefined'
                ? (localStorage.getItem('accessToken') || localStorage.getItem('adminToken'))
                : null;
            const res = await fetch(`${API_BASE}/api/leaderboard?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error('Lỗi tải bảng xếp hạng');
            const json: LeaderboardResponse = await res.json();
            setData(json.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi không xác định');
        } finally {
            setLoading(false);
        }
    }, [period, hsk]);

    useEffect(() => { load(); }, [load]);

    const medal = (rank: number) =>
        rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <Icon name="emoji_events" size="lg" className="text-amber-500" />
                        <h1 className="text-3xl font-bold text-[var(--text-main)]">Bảng xếp hạng</h1>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                        Xếp hạng theo tổng XP tích góp từ flashcard, bài học, và mọi hoạt động học khác.
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-3 mb-6 flex flex-wrap gap-2 items-center">
                    <div className="flex gap-1">
                        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    period === p
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                                }`}
                            >
                                {PERIOD_LABELS[p]}
                            </button>
                        ))}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <label className="text-xs text-[var(--text-muted)]">HSK target:</label>
                        <select
                            value={hsk}
                            onChange={e => setHsk(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none"
                        >
                            {HSK_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                {data?.periodIsFallback && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
                        ℹ Bộ lọc <strong>Tuần / Tháng</strong> đang hiển thị dữ liệu cả thời gian — chức năng theo
                        khung thời gian sẽ ra mắt khi hệ thống có activity log per-day.
                    </div>
                )}

                {/* Ranking */}
                {loading ? (
                    <div className="py-16 flex items-center justify-center" role="status" aria-busy="true">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
                        <span className="sr-only">Đang tải bảng xếp hạng...</span>
                    </div>
                ) : error ? (
                    <div className="py-16 text-center">
                        <Icon name="error" size="xl" className="text-red-500 mb-2" />
                        <p className="text-[var(--text-secondary)]">{error}</p>
                    </div>
                ) : !data || data.ranking.length === 0 ? (
                    <div className="py-16 text-center text-[var(--text-muted)]">
                        <Icon name="emoji_events" size="xl" className="mb-2" />
                        <p>Chưa có ai có XP nào — hãy là người đầu tiên!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.ranking.map(r => (
                            <div
                                key={r.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                    r.isMe
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                        : 'border-[var(--border)] bg-[var(--surface)]'
                                }`}
                            >
                                <div className="w-10 text-center font-bold text-lg shrink-0">
                                    {medal(r.rank) || (
                                        <span className="text-[var(--text-muted)]">#{r.rank}</span>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center overflow-hidden shrink-0">
                                    {r.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Icon name="person" size="sm" className="text-[var(--text-muted)]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-[var(--text-main)] truncate">
                                            {r.displayName}
                                            {r.isMe && <span className="ml-1 text-xs text-[var(--primary)]">(bạn)</span>}
                                        </p>
                                        {r.targetHsk && <HSKBadge level={r.targetHsk} />}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <Icon name="local_fire_department" size="xs" /> {r.currentStreak} ngày
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Icon name="event_available" size="xs" /> {r.totalStudyDays} ngày học
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-[var(--primary)] tabular-nums">
                                        {r.totalXp.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">XP</p>
                                </div>
                            </div>
                        ))}

                        {data.me && !data.ranking.some(r => r.isMe) && (
                            <>
                                <div className="text-center text-xs text-[var(--text-muted)] py-2">…</div>
                                {/* Sticky bottom — luôn hiển thị vị trí "me" khi user scroll list dài. */}
                                <div className="sticky bottom-2 z-10 flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--primary)] bg-[var(--surface)]/95 backdrop-blur-md shadow-lg">
                                    <div className="w-10 text-center font-bold text-lg text-[var(--primary)] shrink-0">
                                        #{data.me.rank}
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center shrink-0">
                                        <Icon name="person" size="sm" className="text-[var(--text-muted)]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[var(--text-main)] truncate">
                                            {data.me.displayName}
                                            <span className="ml-1 text-xs text-[var(--primary)]">(bạn)</span>
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            🔥 {data.me.currentStreak} ngày · {data.me.totalStudyDays} ngày học
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-[var(--primary)] tabular-nums">
                                            {data.me.totalXp.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">XP</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {!isAuthenticated && (
                    <div className="mt-6 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center">
                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                            <Link href="/login" className="text-[var(--primary)] hover:underline">Đăng nhập</Link>{' '}
                            để theo dõi vị trí của bạn trên bảng xếp hạng.
                        </p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
