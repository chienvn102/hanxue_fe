'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/components/AuthContext';
import {
    fetchCoursesShort,
    fetchLessonsShort,
    fetchTodayGoal,
    type CourseShort,
    type LessonShort,
    type TodayGoal,
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

// Game nào gắn theo bài học được (Quiz/type/dictation redirect sang flashcard nên
// vẫn kế thừa lesson; translate là cấp câu nên không theo lesson).
const LESSON_SCOPED: GameId[] = ['flashcard', 'match', 'write', 'grammar-quiz'];

type Mode = 'all' | 'lesson';

export default function PracticeHubPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    // ---- Mục tiêu hôm nay (Ý4b) ----
    const [today, setToday] = useState<TodayGoal | null>(null);
    const [loadingToday, setLoadingToday] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { setToday(null); return; }
        setLoadingToday(true);
        fetchTodayGoal()
            .then(setToday)
            .catch(() => setToday(null))
            .finally(() => setLoadingToday(false));
    }, [isAuthenticated]);

    // ---- Config-on-click (Ý4c): panel cấu hình mở SAU KHI bấm 1 game ----
    const [activeGame, setActiveGame] = useState<GameTile | null>(null);
    const [mode, setMode] = useState<Mode>('all');
    const [hsk, setHsk] = useState('');
    const [count, setCount] = useState(20);

    const [courses, setCourses] = useState<CourseShort[]>([]);
    const [lessonOpts, setLessonOpts] = useState<LessonShort[]>([]);
    const [courseId, setCourseId] = useState<string>('');
    const [lessonId, setLessonId] = useState<string>('');
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loadingLessons, setLoadingLessons] = useState(false);

    const openConfig = (g: GameTile) => {
        if (!g.available) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        // Game không theo lesson → ép mode 'all'.
        if (!LESSON_SCOPED.includes(g.id) && mode === 'lesson') setMode('all');
        setActiveGame(g);
    };
    const closeConfig = useCallback(() => setActiveGame(null), []);

    // Đóng modal bằng Esc.
    useEffect(() => {
        if (!activeGame) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeConfig(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [activeGame, closeConfig]);

    // Lazy-load courses khi chuyển sang lesson mode trong modal.
    useEffect(() => {
        if (!activeGame || mode !== 'lesson' || courses.length) return;
        setLoadingCourses(true);
        fetchCoursesShort()
            .then(setCourses)
            .finally(() => setLoadingCourses(false));
    }, [activeGame, mode, courses.length]);

    useEffect(() => {
        if (!courseId) { setLessonOpts([]); setLessonId(''); return; }
        setLoadingLessons(true);
        fetchLessonsShort(courseId)
            .then(list => {
                setLessonOpts(list);
                setLessonId(prev => prev || (list[0]?.id ? String(list[0].id) : ''));
            })
            .finally(() => setLoadingLessons(false));
    }, [courseId]);

    const lessonScoped = activeGame ? LESSON_SCOPED.includes(activeGame.id) : false;
    const canStart = !activeGame ? false : (mode === 'lesson' ? !!lessonId : true);

    const start = () => {
        if (!activeGame || !canStart) return;
        const params = new URLSearchParams();
        if (mode === 'lesson') {
            if (!lessonId) return;
            params.set('lesson', lessonId);
        } else {
            if (hsk) params.set('hsk', hsk);
            params.set('limit', String(count));
        }
        router.push(`/practice/${activeGame.id}?${params.toString()}`);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)]">Luyện tập</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Chọn một game — cấu hình HSK / số từ hiện ra ngay sau khi bấm.
                    </p>
                </div>

                {/* Mục tiêu hôm nay (Ý4b) — chỉ hiện khi đăng nhập */}
                {isAuthenticated && (
                    <Reveal className="mb-6">
                        <TodayGoalPanel data={today} loading={loadingToday} />
                    </Reveal>
                )}

                {/* Game grid */}
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    <Icon name="sports_esports" size="sm" />
                    Chọn game
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    {GAMES.map((g, i) => (
                        <Reveal key={g.id} index={i}>
                            <button
                                onClick={() => openConfig(g)}
                                disabled={!g.available}
                                className={`group relative w-full h-full text-left p-4 rounded-2xl border-2 hover-lift ${
                                    g.available
                                        ? 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50 cursor-pointer'
                                        : 'bg-[var(--surface-secondary)] border-[var(--border)] opacity-60 cursor-not-allowed'
                                }`}
                            >
                                {!g.available && (
                                    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                        Sắp ra mắt
                                    </span>
                                )}
                                <div className={`w-10 h-10 rounded-xl ${g.bg} ${g.accent} flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110`}>
                                    <Icon name={g.icon} size="md" />
                                </div>
                                <h3 className="font-bold text-[var(--text-main)] mb-0.5">{g.label}</h3>
                                <p className="text-xs text-[var(--text-muted)]">{g.sub}</p>
                            </button>
                        </Reveal>
                    ))}
                </div>
            </main>

            <Footer />

            {/* Config sheet — mở sau khi bấm game (Ý4c) */}
            {activeGame && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
                    onClick={closeConfig}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Cấu hình ${activeGame.label}`}
                >
                    <div
                        className="bg-[var(--surface)] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[var(--border)] shadow-2xl p-5 sm:p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className={`w-11 h-11 rounded-xl ${activeGame.bg} ${activeGame.accent} flex items-center justify-center shrink-0`}>
                                <Icon name={activeGame.icon} size="md" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-[var(--text-main)] truncate">{activeGame.label}</h3>
                                <p className="text-xs text-[var(--text-muted)] truncate">{activeGame.sub}</p>
                            </div>
                            <button
                                onClick={closeConfig}
                                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)] transition-colors"
                                aria-label="Đóng"
                            >
                                <Icon name="close" />
                            </button>
                        </div>

                        {/* Mode toggle — chỉ hiện 'Theo bài học' nếu game gắn lesson được */}
                        {lessonScoped && (
                            <div className="flex gap-2 p-1 mb-4 rounded-xl bg-[var(--surface-secondary)]">
                                {([
                                    { id: 'all',    label: 'Theo HSK',     icon: 'apps' },
                                    { id: 'lesson', label: 'Theo bài học', icon: 'auto_stories' },
                                ] as { id: Mode; label: string; icon: string }[]).map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setMode(t.id)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            mode === t.id
                                                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                        }`}
                                    >
                                        <Icon name={t.icon} size="sm" />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selectors */}
                        {mode === 'all' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">HSK Level</label>
                                    <select
                                        value={hsk}
                                        onChange={e => setHsk(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                    >
                                        {HSK_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Số từ</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {COUNT_OPTS.map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setCount(n)}
                                                className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                                                    count === n
                                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                                                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40'
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Khóa học</label>
                                    <select
                                        value={courseId}
                                        onChange={e => { setCourseId(e.target.value); setLessonId(''); }}
                                        disabled={loadingCourses}
                                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none disabled:opacity-60"
                                    >
                                        <option value="">{loadingCourses ? 'Đang tải…' : '— Chọn khóa —'}</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Bài học</label>
                                    <select
                                        value={lessonId}
                                        onChange={e => setLessonId(e.target.value)}
                                        disabled={!courseId || loadingLessons}
                                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none disabled:opacity-60"
                                    >
                                        <option value="">{!courseId ? 'Chọn khóa trước' : loadingLessons ? 'Đang tải…' : '— Chọn bài —'}</option>
                                        {lessonOpts.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeConfig}
                                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] font-medium text-sm transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={start}
                                disabled={!canStart}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                                <Icon name="play_arrow" size="sm" />
                                Bắt đầu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Panel "Mục tiêu hôm nay" — dùng daily_activity (SRS đã gỡ, không có due-card). */
function TodayGoalPanel({ data, loading }: { data: TodayGoal | null; loading: boolean }) {
    if (loading) {
        return (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="skeleton h-5 w-40 mb-4" />
                <div className="skeleton h-2.5 w-full mb-4" />
                <div className="grid grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-12" />)}
                </div>
            </div>
        );
    }
    if (!data) return null;

    const pct = Math.max(0, Math.min(100, data.goalPercent));
    const stats = [
        { icon: 'local_fire_department', color: 'text-orange-500', value: data.currentStreak, label: 'Ngày streak' },
        { icon: 'bolt',                  color: 'text-amber-500',  value: data.todayXp,       label: 'XP hôm nay' },
        { icon: 'style',                 color: 'text-pink-500',   value: data.wordsReviewed, label: 'Từ đã ôn' },
        { icon: 'schedule',              color: 'text-sky-500',    value: data.studyMins,     label: 'Phút học' },
    ];

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                    <Icon name="flag" className="text-[var(--primary)]" />
                    Mục tiêu hôm nay
                </h2>
                <span className={`text-sm font-bold ${data.goalMet ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>
                    {data.goalMet ? '✓ Đạt mục tiêu!' : `${data.studyMins}/${data.dailyGoalMins} phút`}
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden mb-4">
                <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${data.goalMet ? 'bg-emerald-500' : 'bg-[var(--primary)]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label} className="rounded-xl bg-[var(--surface-secondary)] p-3 text-center">
                        <Icon name={s.icon} className={`${s.color} mb-1`} />
                        <p className="text-lg font-bold text-[var(--text-main)] tabular-nums leading-none">{s.value}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
