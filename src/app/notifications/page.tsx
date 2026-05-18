'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/AuthContext';
import {
    fetchPendingNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    type NotificationItem,
} from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
    streak_reminder: 'Nhắc streak',
    streak_save: 'Cứu streak',
    streak_milestone: 'Streak',
    new_exam: 'Đề thi mới',
    new_course: 'Khóa học mới',
    new_lesson: 'Bài học mới',
    achievement_unlocked: 'Huy hiệu',
    srs_overdue: 'Ôn tập',
    daily_goal: 'Mục tiêu',
    generic: 'Khác',
};

function relativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'Vừa xong';
    const min = Math.floor(ms / 60_000);
    if (min < 60) return `${min} phút trước`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} ngày trước`;
    return new Date(iso).toLocaleDateString('vi-VN');
}

export default function NotificationsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await fetchPendingNotifications();
            setItems(list);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) load();
    }, [isAuthenticated, load]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)]">
                <Header />
                <div className="max-w-3xl mx-auto px-4 py-12 text-center text-[var(--text-muted)]">Đang tải...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[var(--background)]">
                <Header />
                <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                    <p className="text-[var(--text-muted)] mb-4">Bạn cần đăng nhập để xem thông báo.</p>
                    <Link href="/login" className="btn-primary">Đăng nhập</Link>
                </div>
            </div>
        );
    }

    const filtered = filter ? items.filter(i => i.type === filter) : items;
    const unreadCount = items.filter(i => !i.read_at).length;

    const handleClick = async (item: NotificationItem) => {
        if (!item.read_at) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i));
            markNotificationRead(item.id).catch(() => {});
        }
    };

    const handleMarkAll = async () => {
        setItems(prev => prev.map(i => i.read_at ? i : { ...i, read_at: new Date().toISOString() }));
        await markAllNotificationsRead().catch(() => {});
    };

    const types = Array.from(new Set(items.map(i => i.type).filter(Boolean))) as string[];

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Header />
            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">Thông báo</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Bạn đã đọc hết'} · {items.length} thông báo gần đây
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="ghost" onClick={handleMarkAll}>
                            <Icon name="done_all" size="sm" />
                            Đánh dấu đã đọc
                        </Button>
                    )}
                </div>

                {/* Type filters */}
                {types.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setFilter(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filter ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                        >
                            Tất cả
                        </button>
                        {types.map(t => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === t ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                            >
                                {TYPE_LABELS[t] || t}
                            </button>
                        ))}
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="py-12 text-center text-[var(--text-muted)]">Đang tải...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Icon name="notifications_off" size="xl" className="text-[var(--text-muted)] mb-3 inline-block" />
                        <p className="text-[var(--text-muted)]">Chưa có thông báo</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {filtered.map(item => (
                            <li key={item.id}>
                                <Link
                                    href={item.url || '/'}
                                    onClick={() => handleClick(item)}
                                    className={`block p-4 rounded-xl border transition-colors ${!item.read_at
                                        ? 'bg-[var(--primary)]/5 border-[var(--primary)]/30 hover:bg-[var(--primary)]/10'
                                        : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-secondary)]'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.read_at ? 'bg-[var(--surface-secondary)] text-[var(--text-muted)]' : 'bg-[var(--primary)]/15 text-[var(--primary)]'}`}>
                                            <Icon name={item.icon || 'notifications'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <h3 className={`text-sm ${item.read_at ? 'text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-main)]'}`}>
                                                    {item.title}
                                                </h3>
                                                {!item.read_at && <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0 mt-1.5" aria-hidden />}
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1">{item.body}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                {item.type && (
                                                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                                        {TYPE_LABELS[item.type] || item.type}
                                                    </span>
                                                )}
                                                <span className="text-xs text-[var(--text-muted)]">{relativeTime(item.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
