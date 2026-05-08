'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { fetchMatchSession, clearMatchPair, MatchPair } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';

type Cell = { pairId: number; text: string; sub?: string; side: 'zh' | 'vi' };

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function MatchGameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated } = useAuth();

    const hskRaw = searchParams.get('hsk');
    const hskInt = hskRaw ? parseInt(hskRaw, 10) : NaN;
    const hsk = Number.isFinite(hskInt) && hskInt >= 1 && hskInt <= 6 ? hskInt : undefined;

    const [token, setToken] = useState<string>('');
    const [pairs, setPairs] = useState<MatchPair[]>([]);
    const [zhCells, setZhCells] = useState<Cell[]>([]);
    const [viCells, setViCells] = useState<Cell[]>([]);
    const [selectedZh, setSelectedZh] = useState<number | null>(null);
    const [selectedVi, setSelectedVi] = useState<number | null>(null);
    const [cleared, setCleared] = useState<Set<number>>(new Set());
    const [wrong, setWrong] = useState<{ zh: number | null; vi: number | null }>({ zh: null, vi: null });
    const [xpEarned, setXpEarned] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadGame = useCallback(async () => {
        setLoading(true);
        setError('');
        setToken('');
        setPairs([]);
        setCleared(new Set());
        setSelectedZh(null);
        setSelectedVi(null);
        setWrong({ zh: null, vi: null });
        setXpEarned(0);
        try {
            const session = await fetchMatchSession({ hsk, limit: 8 });
            if (session.pairs.length < 2) {
                setError('Không đủ từ vựng để tạo ván. Thử HSK khác.');
                setLoading(false);
                return;
            }
            setToken(session.token);
            setPairs(session.pairs);
            setZhCells(shuffle(session.pairs.map(p => ({ pairId: p.id, text: p.simplified, sub: p.pinyin, side: 'zh' as const }))));
            setViCells(shuffle(session.pairs.map(p => ({ pairId: p.id, text: p.meaningVi, side: 'vi' as const }))));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi tải ván');
        } finally {
            setLoading(false);
        }
    }, [hsk]);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadGame();
    }, [isAuthenticated, loadGame, router]);

    // When both selected → check
    useEffect(() => {
        if (selectedZh === null || selectedVi === null) return;
        if (selectedZh === selectedVi) {
            // Match! Server verify token + vocabId rồi cộng 5 XP.
            const matchedId = selectedZh;
            if (token) {
                clearMatchPair(token, matchedId)
                    .then(r => setXpEarned(x => x + (r.xpEarned || 0)))
                    .catch(() => {});
            }
            setTimeout(() => {
                setCleared(prev => new Set(prev).add(matchedId));
                setSelectedZh(null);
                setSelectedVi(null);
            }, 250);
        } else {
            // Wrong
            setWrong({ zh: selectedZh, vi: selectedVi });
            setTimeout(() => {
                setSelectedZh(null);
                setSelectedVi(null);
                setWrong({ zh: null, vi: null });
            }, 500);
        }
    }, [selectedZh, selectedVi, token]);

    const completed = pairs.length > 0 && cleared.size === pairs.length;

    const handleCellClick = (cell: Cell) => {
        if (cleared.has(cell.pairId)) return;
        if (wrong.zh !== null) return; // wait for shake to clear
        if (cell.side === 'zh') setSelectedZh(cell.pairId);
        else setSelectedVi(cell.pairId);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                            <Icon name="compare_arrows" className="text-amber-500" />
                            Nối từ
                        </h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            Ghép Hán bên trái với nghĩa tiếng Việt bên phải.
                            {hsk ? ` HSK ${hsk}` : ' Tất cả HSK'} · {pairs.length || 8} cặp
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={hsk ?? ''}
                            onChange={e => {
                                const v = e.target.value;
                                const sp = new URLSearchParams(searchParams.toString());
                                if (v) sp.set('hsk', v); else sp.delete('hsk');
                                router.replace(`/practice/match?${sp.toString()}`);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                            title="Đổi HSK level"
                        >
                            <option value="">Tất cả HSK</option>
                            {[1, 2, 3, 4, 5, 6].map(n => (
                                <option key={n} value={n}>HSK {n}</option>
                            ))}
                        </select>
                        <span className="text-sm text-[var(--text-muted)]">
                            <Icon name="bolt" size="xs" className="text-yellow-500 inline" /> +{xpEarned} XP
                        </span>
                        <Link href="/practice">
                            <Button variant="secondary" size="sm">← Quay lại</Button>
                        </Link>
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-20 text-[var(--text-muted)]">
                        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-3"></div>
                        Đang chuẩn bị ván mới...
                    </div>
                )}

                {error && !loading && (
                    <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                        <Icon name="error_outline" size="xl" className="text-red-500 mb-3" />
                        <p className="text-[var(--text-secondary)] mb-4">{error}</p>
                        <Button onClick={loadGame}>Thử lại</Button>
                    </div>
                )}

                {!loading && !error && pairs.length > 0 && !completed && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {/* ZH column */}
                        <div className="space-y-2 sm:space-y-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">汉字</h2>
                            {zhCells.map((c, idx) => {
                                const isCleared = cleared.has(c.pairId);
                                const isSelected = selectedZh === c.pairId;
                                const isWrong = wrong.zh === c.pairId;
                                return (
                                    <button
                                        key={`zh-${idx}`}
                                        onClick={() => handleCellClick(c)}
                                        disabled={isCleared}
                                        className={`w-full text-center p-3 sm:p-4 rounded-xl border-2 transition-all ${
                                            isCleared
                                                ? 'opacity-0 pointer-events-none'
                                                : isWrong
                                                    ? 'bg-red-500/10 border-red-500 animate-shake'
                                                    : isSelected
                                                        ? 'bg-[var(--primary)]/15 border-[var(--primary)]'
                                                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50'
                                        }`}
                                    >
                                        <div className="hanzi text-2xl sm:text-3xl font-normal text-[var(--text-main)]">
                                            {c.text}
                                        </div>
                                        {c.sub && <div className="text-xs text-[var(--text-muted)] mt-1">{c.sub}</div>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* VI column */}
                        <div className="space-y-2 sm:space-y-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Nghĩa tiếng Việt</h2>
                            {viCells.map((c, idx) => {
                                const isCleared = cleared.has(c.pairId);
                                const isSelected = selectedVi === c.pairId;
                                const isWrong = wrong.vi === c.pairId;
                                return (
                                    <button
                                        key={`vi-${idx}`}
                                        onClick={() => handleCellClick(c)}
                                        disabled={isCleared}
                                        className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all ${
                                            isCleared
                                                ? 'opacity-0 pointer-events-none'
                                                : isWrong
                                                    ? 'bg-red-500/10 border-red-500 animate-shake'
                                                    : isSelected
                                                        ? 'bg-[var(--primary)]/15 border-[var(--primary)]'
                                                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50'
                                        }`}
                                    >
                                        <div className="text-sm sm:text-base text-[var(--text-main)] line-clamp-3">
                                            {c.text}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!loading && !error && completed && (
                    <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                        <Icon name="celebration" size="xl" className="text-emerald-500 mb-3" />
                        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Hoàn thành!</h2>
                        <p className="text-[var(--text-secondary)] mb-1">Bạn đã ghép đúng {pairs.length} cặp.</p>
                        <p className="text-[var(--primary)] font-semibold mb-6">+{xpEarned} XP</p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={loadGame}>
                                <Icon name="refresh" size="sm" className="mr-1" />
                                Ván mới
                            </Button>
                            <Link href="/practice">
                                <Button variant="secondary">Về trang Luyện tập</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default function PracticeMatchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <MatchGameContent />
        </Suspense>
    );
}
