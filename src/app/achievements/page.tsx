'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { fetchAchievements, type AchievementItem } from '@/lib/api';

const GROUP_DEFS = [
    { prefix: 'streak_', label: 'Chuỗi học', icon: 'local_fire_department' },
    { prefix: 'xp_', label: 'Kinh nghiệm', icon: 'bolt' },
    { prefix: 'vocab_', label: 'Từ vựng', icon: 'auto_stories' },
    { prefix: 'hsk_', label: 'HSK', icon: 'workspace_premium' },
];

export default function AchievementsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [items, setItems] = useState<AchievementItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchAchievements()
            .then(setItems)
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)]"><Header />
                <div className="max-w-5xl mx-auto px-4 py-12 text-center text-[var(--text-muted)]">Đang tải...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[var(--background)]"><Header />
                <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                    <p className="text-[var(--text-muted)] mb-4">Bạn cần đăng nhập để xem thành tích.</p>
                    <Link href="/login" className="btn-primary">Đăng nhập</Link>
                </div>
            </div>
        );
    }

    const earnedCount = items.filter(i => i.earned).length;
    const groups = GROUP_DEFS.map(g => ({
        ...g,
        items: items.filter(i => i.key.startsWith(g.prefix)),
    })).filter(g => g.items.length > 0);

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Header />
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">Thành tích</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-2">
                        Đã mở khoá <span className="font-bold text-[var(--primary)]">{earnedCount}</span> trên {items.length} huy hiệu
                    </p>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-[var(--text-muted)]">Đang tải...</div>
                ) : groups.length === 0 ? (
                    <div className="py-16 text-center text-[var(--text-muted)]">Chưa có huy hiệu nào</div>
                ) : (
                    <div className="space-y-10">
                        {groups.map(group => (
                            <section key={group.prefix}>
                                <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                    <Icon name={group.icon} className="text-[var(--primary)]" />
                                    {group.label}
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {group.items.map(item => (
                                        <div
                                            key={item.key}
                                            className={`p-4 rounded-2xl border text-center transition-all ${
                                                item.earned
                                                    ? 'bg-[var(--surface)] border-[var(--primary)]/30 shadow-md'
                                                    : 'bg-[var(--surface-secondary)]/50 border-[var(--border)] opacity-60'
                                            }`}
                                        >
                                            <div
                                                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                                                    item.earned
                                                        ? 'bg-gradient-to-br from-[var(--primary)] to-amber-500 text-white shadow-lg'
                                                        : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] grayscale'
                                                }`}
                                            >
                                                <Icon name={item.icon} filled size="lg" />
                                            </div>
                                            <p className={`text-sm font-semibold ${item.earned ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                                                {item.name}
                                            </p>
                                            {item.earned ? (
                                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                                    {item.earnedAt && new Date(item.earnedAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                                    Mục tiêu: {item.target}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
