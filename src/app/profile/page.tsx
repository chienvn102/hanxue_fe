'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/components/AuthContext';
import { fetchProfile, fetchLearningStats, User, LearningStats } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

// HSK level vocabulary counts (standard)
const HSK_VOCAB_COUNTS: Record<number, number> = {
    1: 150,
    2: 150,
    3: 300,
    4: 600,
    5: 1300,
    6: 2500,
};

export default function ProfilePage() {
    const { user: authUser, logout } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [stats, setStats] = useState<LearningStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [profileData, statsData] = await Promise.all([
                    fetchProfile().catch(() => null),
                    fetchLearningStats().catch(() => null)
                ]);

                if (profileData) {
                    setProfile(profileData);
                } else if (authUser) {
                    setProfile(authUser);
                }

                if (statsData) {
                    setStats(statsData);
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
                if (authUser) setProfile(authUser);
            } finally {
                setLoading(false);
            }
        };

        if (authUser) {
            loadData();
        }
    }, [authUser]);

    // Calculate HSK progress from stats
    const getHskProgress = (level: number): { learned: number; total: number; percent: number } => {
        const total = HSK_VOCAB_COUNTS[level] || 0;
        const learned = stats?.hskDistribution?.[level] || 0;
        const percent = total > 0 ? Math.round((learned / total) * 100) : 0;
        return { learned, total, percent };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const currentHsk = profile.targetHsk || 1;

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col font-sans text-[var(--text-main)]">
            <Header />

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column: Profile Card & Nav */}
                    <aside className="w-full lg:w-1/4 flex-shrink-0 flex flex-col gap-6">
                        {/* Profile Card */}
                        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm p-6 flex flex-col items-center text-center relative overflow-hidden transition-all hover:shadow-md">
                            <div className="h-20 w-full bg-gradient-to-r from-[var(--primary)]/10 to-orange-500/10 absolute top-0 left-0"></div>

                            <div className="relative mt-4 mb-3 group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--surface)] shadow-md bg-[var(--surface-secondary)] flex items-center justify-center text-3xl font-bold text-[var(--primary)]">
                                    {profile.avatarUrl ? (
                                        <img
                                            alt={profile.displayName}
                                            className="w-full h-full object-cover"
                                            src={profile.avatarUrl}
                                        />
                                    ) : (
                                        profile.displayName?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <button className="absolute bottom-0 right-0 bg-[var(--surface)] p-1.5 rounded-full border border-[var(--border)] shadow-sm cursor-pointer hover:text-[var(--primary)] transition-colors text-[var(--text-secondary)]">
                                    <Icon name="photo_camera" size="xs" />
                                </button>
                            </div>

                            <h2 className="text-lg font-bold text-[var(--text-main)]">{profile.displayName}</h2>
                            <p className="text-[var(--text-muted)] text-sm mb-3 break-all">{profile.email}</p>

                            <div className="flex items-center gap-2 mb-6">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                                    HSK {currentHsk}
                                </span>
                                {profile.isPremium && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide gap-1">
                                        <Icon name="workspace_premium" size="xs" className="w-3 h-3" />
                                        Premium
                                    </span>
                                )}
                            </div>

                            <div className="w-full border-t border-[var(--border)] pt-4 grid grid-cols-2 gap-2 text-center">
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Tham gia</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">
                                        {new Date(profile.createdAt || Date.now()).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Tổng ngày</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{profile.totalStudyDays || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Menu */}
                        <nav className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm p-2 flex flex-col">
                            <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--primary)] bg-[var(--primary)]/5 rounded-xl transition-colors">
                                <Icon name="dashboard" filled className="text-lg" />
                                <span>Tổng quan</span>
                            </Link>
                            <Link href="/courses" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors">
                                <Icon name="auto_stories" className="text-lg" />
                                <span>Khóa học của tôi</span>
                            </Link>
                            <Link href="/achievements" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors">
                                <Icon name="emoji_events" className="text-lg" />
                                <span>Thành tích</span>
                            </Link>
                            <div className="my-1 border-t border-[var(--border)] opacity-50"></div>
                            <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors">
                                <Icon name="settings" className="text-lg" />
                                <span>Cài đặt</span>
                            </Link>
                        </nav>

                        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm p-2">
                            <button
                                onClick={logout}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/5 rounded-xl transition-colors"
                            >
                                <Icon name="logout" className="text-lg" />
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    </aside>

                    {/* Right Column: Key Stats & Activity */}
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Stats Grid */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Streak */}
                            <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between group hover:border-orange-500/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Streak</span>
                                    <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <Icon name="local_fire_department" filled className="text-lg" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--text-main)]">{profile.currentStreak || 0}</h3>
                                    <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1 mt-1">
                                        <Icon name="trending_up" size="xs" /> Ngày liên tiếp
                                    </p>
                                </div>
                            </div>

                            {/* XP */}
                            <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between group hover:border-yellow-500/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total XP</span>
                                    <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                        <Icon name="bolt" filled className="text-lg" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--text-main)]">{profile.totalXp || 0}</h3>
                                    <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1">Điểm kinh nghiệm</p>
                                </div>
                            </div>

                            {/* Words Learned */}
                            <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Từ vựng</span>
                                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Icon name="menu_book" filled className="text-lg" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--text-main)]">{stats?.totalLearned || 0}</h3>
                                    <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1 mt-1">
                                        Đã thuộc
                                    </p>
                                </div>
                            </div>

                            {/* Active Days */}
                            <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between group hover:border-purple-500/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Chăm chỉ</span>
                                    <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <Icon name="calendar_month" filled className="text-lg" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--text-main)]">{profile.totalStudyDays || 0}</h3>
                                    <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1">Ngày học tập</p>
                                </div>
                            </div>
                        </section>

                        {/* Learning Progress (HSK Levels) */}
                        <section className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <Icon name="school" className="text-[var(--primary)]" />
                                    Tiến độ học tập
                                </h3>
                                <Link href="/learn" className="text-sm font-medium text-[var(--primary)] hover:underline">Chi tiết</Link>
                            </div>

                            <div>
                                {[1, 2, 3, 4, 5, 6].map((level) => {
                                    const progress = getHskProgress(level);
                                    const isCurrentLevel = level === currentHsk;
                                    const isCompleted = progress.percent >= 100;
                                    const isLocked = level > currentHsk && !isCompleted;

                                    return (
                                        <div
                                            key={level}
                                            className={`p-5 border-b border-[var(--border)] last:border-b-0 transition-colors ${isCurrentLevel ? 'bg-[var(--primary)]/5' : isLocked ? 'opacity-60' : 'hover:bg-[var(--surface-secondary)]/50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isCompleted
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : isCurrentLevel
                                                                ? 'bg-[var(--card-bg)] text-[var(--primary)] shadow-sm border border-[var(--border)]'
                                                                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border)]'
                                                        }`}>
                                                        <Icon
                                                            name={isCompleted ? 'check' : isCurrentLevel ? 'play_arrow' : 'lock'}
                                                            size="xs"
                                                            className="font-bold"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[var(--text-main)] text-sm">HSK {level}</p>
                                                        <p className={`text-xs ${isCompleted
                                                                ? 'text-emerald-600'
                                                                : isCurrentLevel
                                                                    ? 'text-[var(--primary)] font-bold'
                                                                    : 'text-[var(--text-muted)]'
                                                            }`}>
                                                            {isCompleted ? 'Đã hoàn thành' : isCurrentLevel ? 'Đang học' : 'Chưa mở khóa'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-bold text-sm ${isCompleted ? 'text-emerald-600' : isCurrentLevel ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                                                        }`}>
                                                        {progress.percent}%
                                                    </span>
                                                    <p className="text-[10px] text-[var(--text-muted)]">
                                                        {progress.learned}/{progress.total} từ
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${isCompleted
                                                            ? 'bg-emerald-500'
                                                            : isCurrentLevel
                                                                ? 'bg-[var(--primary)] shadow-[0_0_10px_var(--primary-light)]'
                                                                : 'bg-[var(--text-muted)]'
                                                        }`}
                                                    style={{ width: `${progress.percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Recent Activity */}
                        <section className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <Icon name="schedule" className="text-[var(--primary)]" />
                                    Hoạt động gần đây
                                </h3>
                                <button className="text-xs font-bold text-[var(--primary)] hover:underline">Xem tất cả</button>
                            </div>

                            <div className="flex flex-col gap-4">
                                {/* Mock Data */}
                                {[
                                    { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-500/10', title: 'Hoàn thành bài học: Gia đình', exp: '+25 XP', time: '2 giờ trước' },
                                    { icon: 'local_fire_department', color: 'text-orange-500', bg: 'bg-orange-500/10', title: 'Đạt chuỗi 3 ngày liên tiếp', exp: 'Badge', time: 'Hôm qua' },
                                    { icon: 'style', color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Ôn tập 20 từ vựng', exp: '100%', time: 'Hôm qua' },
                                ].map((item, index) => (
                                    <div key={index} className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--surface-secondary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer group">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={`h-10 w-10 rounded-full ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                <Icon name={item.icon} filled className="text-xl" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <h4 className="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">{item.title}</h4>
                                                <span className="text-xs text-[var(--text-muted)]">{item.time}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{item.exp}</p>
                                        </div>
                                    </div>
                                ))}

                                <div className="text-center pt-2">
                                    <p className="text-xs text-[var(--text-muted)] italic">Chưa có nhiều hoạt động để hiển thị.</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
