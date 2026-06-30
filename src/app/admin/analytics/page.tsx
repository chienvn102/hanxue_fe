'use client';

/**
 * Admin Analytics — thống kê hoạt động & kết quả người dùng.
 * Trang quản lý RIÊNG (không gộp vào Tổng quan): người dùng, khóa học, bài học,
 * và kết quả làm đề HSK. Nguồn: GET /api/admin/analytics.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Icon } from '@/components/ui/Icon';
import { HSK_COLORS } from '@/components/admin/hsk-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface SeriesPoint { date: string; count: number; }
interface Analytics {
    users: {
        total: number; new7d: number; new30d: number; active7d: number; active30d: number;
        byHsk: { hsk: number; count: number }[];
        registrations: SeriesPoint[];
    };
    lessons: { completed: number; inProgress: number };
    courses: {
        totalCompletions: number;
        perCourse: { id: number; title: string; hskLevel: number; lessonCount: number; learners: number; lessonCompletions: number; completed: number }[];
    };
    exams: {
        attempts: number; completed: number; passed: number; avgPct: number | null; avgTime: number | null;
        series: SeriesPoint[];
        perExam: { id: number; title: string; hskLevel: number; formatVersion: number; attempts: number; completed: number; passed: number; avgPct: number | null; avgTime: number | null }[];
    };
}

// Build a continuous list of the last N day labels (YYYY-MM-DD).
function lastNDays(n: number): string[] {
    const out: string[] = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        out.push(d.toISOString().slice(0, 10));
    }
    return out;
}

function fillSeries(series: SeriesPoint[], days = 14): SeriesPoint[] {
    const map = new Map(series.map(s => [s.date, s.count]));
    return lastNDays(days).map(date => ({ date, count: map.get(date) || 0 }));
}

function fmtTime(sec: number | null): string {
    if (sec === null || sec === undefined) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
}

function pct(part: number, whole: number): number {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export default function AdminAnalyticsPage() {
    const { token } = useAdminAuth();
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE}/api/admin/analytics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Lỗi tải thống kê');
            setData(json.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tải thống kê');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
            </div>
        );
    }
    if (error || !data) {
        return (
            <div className="p-6 rounded-xl bg-red-500/10 text-red-500 text-sm">{error || 'Không tải được thống kê'}</div>
        );
    }

    const { users, lessons, courses, exams } = data;
    const examPassRate = pct(exams.passed, exams.completed);

    const cards = [
        { label: 'Tổng người dùng', value: users.total, sub: `+${users.new7d} trong 7 ngày`, icon: 'group', color: 'text-blue-500 bg-blue-500/10' },
        { label: 'Hoạt động 7 ngày', value: users.active7d, sub: `${users.active30d} trong 30 ngày`, icon: 'bolt', color: 'text-emerald-500 bg-emerald-500/10' },
        { label: 'Lượt thi HSK', value: exams.attempts, sub: `${exams.completed} đã nộp`, icon: 'quiz', color: 'text-red-500 bg-red-500/10' },
        { label: 'Tỉ lệ đạt thi', value: `${examPassRate}%`, sub: `${exams.passed}/${exams.completed} đạt`, icon: 'workspace_premium', color: 'text-amber-500 bg-amber-500/10' },
        { label: 'Hoàn thành khóa', value: courses.totalCompletions, sub: `${courses.perCourse.length} khóa`, icon: 'school', color: 'text-purple-500 bg-purple-500/10' },
        { label: 'Bài học hoàn thành', value: lessons.completed, sub: `${lessons.inProgress} đang học`, icon: 'menu_book', color: 'text-teal-500 bg-teal-500/10' },
    ];

    const regSeries = fillSeries(users.registrations);
    const examSeries = fillSeries(exams.series);
    const maxHsk = Math.max(1, ...users.byHsk.map(b => b.count));

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Icon name="monitoring" /> Thống kê
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Hoạt động người dùng, tiến độ khóa/bài học và kết quả thi HSK.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                    <Icon name="refresh" size="sm" /> Làm mới
                </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map(c => (
                    <div key={c.label} className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.color}`}>
                            <Icon name={c.icon} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-muted)]">{c.label}</p>
                            <p className="text-2xl font-bold text-[var(--text-main)]">{typeof c.value === 'number' ? c.value.toLocaleString() : c.value}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{c.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Time-series bars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DayBars title="Người dùng mới (14 ngày)" series={regSeries} barClass="bg-blue-500" />
                <DayBars title="Lượt làm đề HSK (14 ngày)" series={examSeries} barClass="bg-red-500" />
            </div>

            {/* Users by HSK level */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                <h2 className="font-bold text-[var(--text-main)] mb-4">Người dùng theo cấp mục tiêu HSK</h2>
                {users.byHsk.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu.</p>
                ) : (
                    <div className="space-y-2">
                        {users.byHsk.map(b => (
                            <div key={b.hsk} className="flex items-center gap-3">
                                <span className={`${HSK_COLORS[b.hsk] || 'bg-gray-400'} text-white text-xs font-bold px-2 py-0.5 rounded w-14 text-center shrink-0`}>HSK {b.hsk}</span>
                                <div className="flex-1 h-5 bg-[var(--surface-secondary)] rounded overflow-hidden">
                                    <div className="h-full bg-[var(--primary)]/70 rounded" style={{ width: `${pct(b.count, maxHsk)}%` }} />
                                </div>
                                <span className="text-sm font-mono text-[var(--text-secondary)] w-12 text-right shrink-0">{b.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Per-course table */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                <h2 className="font-bold text-[var(--text-main)] p-6 pb-3">Tiến độ theo khóa học</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[var(--text-muted)] border-y border-[var(--border)] bg-[var(--background)]">
                                <th className="px-4 py-2 font-medium">Khóa học</th>
                                <th className="px-4 py-2 font-medium text-center">Cấp</th>
                                <th className="px-4 py-2 font-medium text-right">Người học</th>
                                <th className="px-4 py-2 font-medium text-right">Bài đã xong</th>
                                <th className="px-4 py-2 font-medium text-right">Hoàn thành khóa</th>
                                <th className="px-4 py-2 font-medium text-right">Tỉ lệ HT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.perCourse.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-6 text-center text-[var(--text-muted)]">Chưa có dữ liệu.</td></tr>
                            ) : courses.perCourse.map(c => (
                                <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-secondary)]/40">
                                    <td className="px-4 py-2 text-[var(--text-main)] max-w-[280px] truncate">{c.title}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`${HSK_COLORS[c.hskLevel] || 'bg-gray-400'} text-white text-[11px] font-bold px-1.5 py-0.5 rounded`}>HSK {c.hskLevel}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{c.learners}</td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{c.lessonCompletions}</td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{c.completed}</td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{pct(c.completed, c.learners)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Per-exam table */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                <h2 className="font-bold text-[var(--text-main)] p-6 pb-3">Kết quả theo đề thi HSK</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[var(--text-muted)] border-y border-[var(--border)] bg-[var(--background)]">
                                <th className="px-4 py-2 font-medium">Đề thi</th>
                                <th className="px-4 py-2 font-medium text-center">Cấp</th>
                                <th className="px-4 py-2 font-medium text-right">Lượt làm</th>
                                <th className="px-4 py-2 font-medium text-right">Đã nộp</th>
                                <th className="px-4 py-2 font-medium text-right">Tỉ lệ đạt</th>
                                <th className="px-4 py-2 font-medium text-right">Điểm TB</th>
                                <th className="px-4 py-2 font-medium text-right">T.gian TB</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exams.perExam.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-6 text-center text-[var(--text-muted)]">Chưa có lượt làm đề nào.</td></tr>
                            ) : exams.perExam.map(e => (
                                <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-secondary)]/40">
                                    <td className="px-4 py-2 text-[var(--text-main)] max-w-[260px] truncate">
                                        {e.title}
                                        {e.formatVersion === 2 && <span className="ml-1 text-[10px] text-[var(--text-muted)]">v2</span>}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`${HSK_COLORS[e.hskLevel] || 'bg-gray-400'} text-white text-[11px] font-bold px-1.5 py-0.5 rounded`}>HSK {e.hskLevel}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{e.attempts}</td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{e.completed}</td>
                                    <td className="px-4 py-2 text-right font-mono">
                                        <span className={pct(e.passed, e.completed) >= 70 ? 'text-emerald-600' : 'text-amber-600'}>
                                            {pct(e.passed, e.completed)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{e.avgPct === null ? '—' : `${e.avgPct}%`}</td>
                                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{fmtTime(e.avgTime)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Simple 14-day bar chart (compositor-friendly, no chart lib).
function DayBars({ title, series, barClass }: { title: string; series: SeriesPoint[]; barClass: string }) {
    const max = Math.max(1, ...series.map(s => s.count));
    const total = series.reduce((s, p) => s + p.count, 0);
    return (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text-main)]">{title}</h2>
                <span className="text-sm text-[var(--text-muted)]">Tổng {total}</span>
            </div>
            <div className="flex items-end gap-1 h-32">
                {series.map(p => (
                    <div key={p.date} className="flex-1 flex flex-col items-center justify-end group relative">
                        <div
                            className={`w-full ${barClass} rounded-t transition-all`}
                            style={{ height: `${Math.max(4, (p.count / max) * 100)}%`, opacity: p.count === 0 ? 0.25 : 1 }}
                            title={`${p.date}: ${p.count}`}
                        />
                        <span className="text-[9px] text-[var(--text-muted)] mt-1">{p.date.slice(8)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
