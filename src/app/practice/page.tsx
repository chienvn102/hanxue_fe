'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { fetchLearningStats } from '@/lib/api';

type GameId = 'flashcard' | 'quiz' | 'match' | 'write' | 'type' | 'dictation' | 'translate';

interface GameTile {
    id: GameId;
    label: string;
    sub: string;
    icon: string;
    accent: string;     // text color
    bg: string;         // background tint
    available: boolean;
}

// `available` PHẢI khớp với route thật:
// - true = route trỏ tới game thực (redirect /flashcard/session hoặc page riêng)
// - false = page placeholder "đang phát triển"
//
// `sub` PHẢI khớp với hành vi thật của session, không hứa thứ chưa làm.
const GAMES: GameTile[] = [
    { id: 'flashcard',  label: 'Flashcard',     sub: 'Trắc nghiệm A/B/C/D',     icon: 'style',          accent: 'text-pink-500',    bg: 'bg-pink-500/10',    available: true },
    { id: 'quiz',       label: 'Trắc nghiệm',   sub: 'Chọn nghĩa đúng',         icon: 'check_box',      accent: 'text-emerald-500', bg: 'bg-emerald-500/10', available: true },
    { id: 'match',      label: 'Nối từ',        sub: 'Ghép Hán ↔ nghĩa',        icon: 'compare_arrows', accent: 'text-amber-500',   bg: 'bg-amber-500/10',   available: false },
    { id: 'write',      label: 'Viết chữ',      sub: 'Vẽ Hán theo nét',         icon: 'draw',           accent: 'text-orange-500',  bg: 'bg-orange-500/10',  available: false },
    { id: 'type',       label: 'Gõ từ',         sub: 'Gõ nghĩa tiếng Việt',     icon: 'keyboard',       accent: 'text-sky-500',     bg: 'bg-sky-500/10',     available: true },
    { id: 'dictation',  label: 'Nghe viết',     sub: 'Nghe → gõ Hán',           icon: 'hearing',        accent: 'text-purple-500',  bg: 'bg-purple-500/10',  available: true },
    { id: 'translate',  label: 'Dịch câu',      sub: 'Dịch Việt ↔ Trung',       icon: 'translate',      accent: 'text-indigo-500',  bg: 'bg-indigo-500/10',  available: false },
];

const HSK_OPTS = [
    { value: '', label: 'Tất cả HSK' },
    { value: '1', label: 'HSK 1' },
    { value: '2', label: 'HSK 2' },
    { value: '3', label: 'HSK 3' },
    { value: '4', label: 'HSK 4' },
    { value: '5', label: 'HSK 5' },
    { value: '6', label: 'HSK 6' },
];

const COUNT_OPTS = [10, 20, 50, 100];

export default function PracticeHubPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const [hsk, setHsk] = useState('');
    const [count, setCount] = useState(20);
    const [dueCount, setDueCount] = useState(0);
    const [loadingDue, setLoadingDue] = useState(false);

    const loadDue = useCallback(async () => {
        if (!isAuthenticated) {
            setDueCount(0);
            return;
        }
        setLoadingDue(true);
        try {
            // Dùng `due_today` từ /api/progress/stats — count chính xác (không bị
            // cap bởi limit). Stats hiện chưa filter theo HSK level → số là tổng
            // toàn cục, đúng kỳ vọng cho hub-level "N từ sẵn sàng".
            const stats = await fetchLearningStats();
            setDueCount(stats.dueToday || 0);
        } catch (e) {
            console.error('fetchLearningStats failed', e);
        } finally {
            setLoadingDue(false);
        }
    }, [isAuthenticated]);

    useEffect(() => { loadDue(); }, [loadDue]);

    const startGame = (id: GameId) => {
        const game = GAMES.find(g => g.id === id);
        if (!game?.available) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        const params = new URLSearchParams();
        if (hsk) params.set('hsk', hsk);
        params.set('limit', String(count));
        router.push(`/practice/${id}?${params.toString()}`);
    };

    const startSrs = () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        const params = new URLSearchParams();
        if (hsk) params.set('hsk', hsk);
        params.set('limit', String(count));
        router.push(`/practice/srs?${params.toString()}`);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">Luyện tập</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Chọn bộ lọc, sau đó pick một game để học.
                    </p>
                </div>

                {/* Filter bar — chỉ giữ HSK + Số từ vì BE flashcard session chỉ
                    đọc 2 param này. Status/Order sẽ thêm khi BE/session support. */}
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">HSK Level</label>
                            <select
                                value={hsk}
                                onChange={e => setHsk(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                            >
                                {HSK_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Số từ</label>
                            <select
                                value={count}
                                onChange={e => setCount(parseInt(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                            >
                                {COUNT_OPTS.map(n => <option key={n} value={n}>{n} từ</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Game grid */}
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    <Icon name="sports_esports" size="sm" />
                    Chọn game
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    {GAMES.map(g => (
                        <button
                            key={g.id}
                            onClick={() => startGame(g.id)}
                            disabled={!g.available}
                            className={`group relative text-left p-4 rounded-2xl border-2 transition-all ${
                                g.available
                                    ? 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:shadow-md cursor-pointer'
                                    : 'bg-[var(--surface-secondary)] border-[var(--border)] opacity-60 cursor-not-allowed'
                            }`}
                        >
                            {!g.available && (
                                <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                    Sắp ra mắt
                                </span>
                            )}
                            <div className={`w-10 h-10 rounded-xl ${g.bg} ${g.accent} flex items-center justify-center mb-3`}>
                                <Icon name={g.icon} size="md" />
                            </div>
                            <h3 className="font-bold text-[var(--text-main)] mb-0.5">{g.label}</h3>
                            <p className="text-xs text-[var(--text-muted)]">{g.sub}</p>
                        </button>
                    ))}
                </div>

                {/* SRS panel */}
                <div className="rounded-2xl border-2 border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/10 to-purple-500/10 p-5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center shrink-0">
                                <Icon name="autorenew" size="md" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                                    Ôn tập ngắt quãng (SRS)
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Hệ thống tự động lên lịch ôn từ vào đúng thời điểm sắp quên. Dùng SM-2.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-[var(--primary)]">
                                    {loadingDue ? '...' : dueCount}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">từ sẵn sàng</p>
                            </div>
                            <Button
                                onClick={startSrs}
                                disabled={!isAuthenticated || dueCount === 0}
                                className="whitespace-nowrap"
                            >
                                Bắt đầu ôn tập
                                <Icon name="arrow_forward" size="sm" className="ml-1" />
                            </Button>
                        </div>
                    </div>
                    {!isAuthenticated && (
                        <p className="text-xs text-[var(--text-muted)] mt-3">
                            <Link href="/login" className="text-[var(--primary)] hover:underline">Đăng nhập</Link> để
                            theo dõi tiến độ + dùng SRS.
                        </p>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
