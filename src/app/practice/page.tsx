'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import {
    fetchCoursesShort,
    fetchLessonsShort,
    type CourseShort,
    type LessonShort,
} from '@/lib/api';

type GameId = 'flashcard' | 'quiz' | 'match' | 'write' | 'type' | 'dictation' | 'translate' | 'grammar-quiz';

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
    { id: 'match',      label: 'Nối từ',        sub: 'Ghép Hán ↔ nghĩa',        icon: 'compare_arrows', accent: 'text-amber-500',   bg: 'bg-amber-500/10',   available: true },
    { id: 'write',      label: 'Viết chữ',      sub: 'Vẽ Hán theo nét',   icon: 'draw',           accent: 'text-orange-500',  bg: 'bg-orange-500/10',  available: true },
    { id: 'type',       label: 'Gõ từ',         sub: 'Gõ nghĩa tiếng Việt',     icon: 'keyboard',       accent: 'text-sky-500',     bg: 'bg-sky-500/10',     available: true },
    { id: 'dictation',  label: 'Nghe viết',     sub: 'Nghe → gõ Hán',           icon: 'hearing',        accent: 'text-purple-500',  bg: 'bg-purple-500/10',  available: true },
    { id: 'translate',  label: 'Dịch câu',      sub: 'AI sinh câu, bạn dịch',    icon: 'translate',      accent: 'text-indigo-500',  bg: 'bg-indigo-500/10',  available: true },
    { id: 'grammar-quiz', label: 'Trắc nghiệm ngữ pháp', sub: 'MCQ theo điểm ngữ pháp', icon: 'menu_book',    accent: 'text-rose-500',    bg: 'bg-rose-500/10',    available: true },
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

    // Tab mode: "all" = legacy HSK + count filter; "lesson" = course → lesson picker.
    type Mode = 'all' | 'lesson';
    const [mode, setMode] = useState<Mode>('all');
    const [courses, setCourses] = useState<CourseShort[]>([]);
    const [lessonOpts, setLessonOpts] = useState<LessonShort[]>([]);
    const [courseId, setCourseId] = useState<string>('');
    const [lessonId, setLessonId] = useState<string>('');
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loadingLessons, setLoadingLessons] = useState(false);

    // Lazy-load courses on first switch to lesson mode.
    useEffect(() => {
        if (mode !== 'lesson' || courses.length) return;
        setLoadingCourses(true);
        fetchCoursesShort()
            .then(setCourses)
            .finally(() => setLoadingCourses(false));
    }, [mode, courses.length]);

    useEffect(() => {
        if (!courseId) { setLessonOpts([]); setLessonId(''); return; }
        setLoadingLessons(true);
        fetchLessonsShort(courseId)
            .then(list => {
                setLessonOpts(list);
                // Auto-pick first lesson if none chosen yet.
                setLessonId(prev => prev || (list[0]?.id ? String(list[0].id) : ''));
            })
            .finally(() => setLoadingLessons(false));
    }, [courseId]);

    const startGame = (id: GameId) => {
        const game = GAMES.find(g => g.id === id);
        if (!game?.available) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        const params = new URLSearchParams();
        if (mode === 'lesson') {
            if (!lessonId) return; // need a lesson picked
            params.set('lesson', lessonId);
        } else {
            if (hsk) params.set('hsk', hsk);
            params.set('limit', String(count));
        }
        router.push(`/practice/${id}?${params.toString()}`);
    };

    // In lesson mode only the games that meaningfully scope to a lesson are
    // enabled: flashcard, match, write, grammar-quiz. (Quiz/type/dictation
    // redirect to flashcard so they naturally inherit lesson; translate is
    // sentence-level not lesson-scoped.)
    const lessonScopedIds: GameId[] = ['flashcard', 'match', 'write', 'grammar-quiz'];
    const isAvailable = (g: GameTile) =>
        g.available && (mode === 'all' || lessonScopedIds.includes(g.id));

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

                {/* Mode tabs */}
                <div className="flex gap-2 mb-4 border-b border-[var(--border)]">
                    {([
                        { id: 'all',    label: 'Tất cả',       icon: 'apps' },
                        { id: 'lesson', label: 'Theo bài học', icon: 'auto_stories' },
                    ] as { id: Mode; label: string; icon: string }[]).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setMode(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 font-semibold text-sm transition-colors ${
                                mode === t.id
                                    ? 'border-[var(--primary)] text-[var(--primary)]'
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                        >
                            <Icon name={t.icon} size="sm" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Filter bar */}
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 mb-6">
                    {mode === 'all' ? (
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
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Khóa học</label>
                                <select
                                    value={courseId}
                                    onChange={e => { setCourseId(e.target.value); setLessonId(''); }}
                                    disabled={loadingCourses}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none disabled:opacity-60"
                                >
                                    <option value="">{loadingCourses ? 'Đang tải…' : '— Chọn khóa —'}</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Bài học</label>
                                <select
                                    value={lessonId}
                                    onChange={e => setLessonId(e.target.value)}
                                    disabled={!courseId || loadingLessons}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none disabled:opacity-60"
                                >
                                    <option value="">{!courseId ? 'Chọn khóa trước' : loadingLessons ? 'Đang tải…' : '— Chọn bài —'}</option>
                                    {lessonOpts.map(l => (
                                        <option key={l.id} value={l.id}>{l.title}</option>
                                    ))}
                                </select>
                            </div>
                            {mode === 'lesson' && !lessonId && (
                                <p className="sm:col-span-2 text-xs text-[var(--text-muted)] mt-1">
                                    Chọn 1 bài học để tile bên dưới trở nên click được.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Game grid */}
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    <Icon name="sports_esports" size="sm" />
                    Chọn game
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    {GAMES.map(g => {
                        const usable = isAvailable(g) && (mode === 'all' || !!lessonId);
                        const lessonOnlyExcluded = mode === 'lesson' && g.available && !lessonScopedIds.includes(g.id);
                        return (
                            <button
                                key={g.id}
                                onClick={() => startGame(g.id)}
                                disabled={!usable}
                                title={lessonOnlyExcluded ? 'Game này không gắn theo bài học' : ''}
                                className={`group relative text-left p-4 rounded-2xl border-2 transition-all ${
                                    usable
                                        ? 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:shadow-md cursor-pointer'
                                        : 'bg-[var(--surface-secondary)] border-[var(--border)] opacity-60 cursor-not-allowed'
                                }`}
                            >
                                {!g.available && (
                                    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                        Sắp ra mắt
                                    </span>
                                )}
                                {lessonOnlyExcluded && (
                                    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                        Không theo bài
                                    </span>
                                )}
                                <div className={`w-10 h-10 rounded-xl ${g.bg} ${g.accent} flex items-center justify-center mb-3`}>
                                    <Icon name={g.icon} size="md" />
                                </div>
                                <h3 className="font-bold text-[var(--text-main)] mb-0.5">{g.label}</h3>
                                <p className="text-xs text-[var(--text-muted)]">{g.sub}</p>
                            </button>
                        );
                    })}
                </div>

            </main>

            <Footer />
        </div>
    );
}
