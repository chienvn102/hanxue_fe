'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HSKBadge } from '@/components/ui/Badge';
import { useAuth } from '@/components/AuthContext';
import {
    fetchGrammarList,
    startGrammarQuiz,
    answerGrammarQuiz,
    finishGrammarQuiz,
    fetchLessonMeta,
    fetchLessonGrammarIds,
    type Grammar,
    type GrammarQuizQuestion,
    type GrammarQuizAnswerResult,
    type GrammarQuizFinishResult,
    type LessonMeta,
} from '@/lib/api';

const HSK_OPTS = [
    { value: '', label: 'Tất cả HSK' },
    { value: '1', label: 'HSK 1' },
    { value: '2', label: 'HSK 2' },
    { value: '3', label: 'HSK 3' },
    { value: '4', label: 'HSK 4' },
    { value: '5', label: 'HSK 5' },
    { value: '6', label: 'HSK 6' },
];

const COUNT_OPTS = [10, 20, 30, 50];

type Phase = 'setup' | 'quiz' | 'result';

function GrammarQuizInner() {
    const router = useRouter();
    const search = useSearchParams();
    const { isAuthenticated } = useAuth();

    // ---- Setup state ----
    const [hsk, setHsk] = useState(search.get('hsk') ?? '');
    const [limit, setLimit] = useState(() => {
        const q = parseInt(search.get('limit') ?? '', 10);
        return COUNT_OPTS.includes(q) ? q : 10;
    });
    const [grammarList, setGrammarList] = useState<Grammar[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [selected, setSelected] = useState<Set<number>>(() => {
        const g = parseInt(search.get('grammar') ?? '', 10);
        return Number.isFinite(g) ? new Set([g]) : new Set();
    });

    // ---- Lesson preselect ----
    const lessonParam = search.get('lesson');
    const lessonId = (() => {
        const n = parseInt(lessonParam ?? '', 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    })();
    const [lessonMeta, setLessonMeta] = useState<LessonMeta | null>(null);

    useEffect(() => {
        if (!lessonId) return;
        let cancelled = false;
        Promise.all([
            fetchLessonMeta(lessonId),
            fetchLessonGrammarIds(lessonId),
        ]).then(([meta, ids]) => {
            if (cancelled) return;
            setLessonMeta(meta);
            // Sync HSK filter to lesson level so the grammar list below loads the
            // right pool. Preselect all grammar IDs of the lesson.
            if (meta) setHsk(String(meta.hsk_level));
            if (ids.length) setSelected(new Set(ids));
        }).catch(() => { /* silent */ });
        return () => { cancelled = true; };
    }, [lessonId]);

    // ---- Quiz state ----
    const [phase, setPhase] = useState<Phase>('setup');
    const [starting, setStarting] = useState(false);
    const [token, setToken] = useState('');
    const [questions, setQuestions] = useState<GrammarQuizQuestion[]>([]);
    const [index, setIndex] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);
    const [answer, setAnswer] = useState<GrammarQuizAnswerResult | null>(null);
    const [grading, setGrading] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [result, setResult] = useState<GrammarQuizFinishResult | null>(null);
    const [error, setError] = useState('');

    // Redirect guests to login (mirror practice hub guard).
    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    // Load grammar points for the selected HSK level.
    useEffect(() => {
        let cancelled = false;
        setLoadingList(true);
        fetchGrammarList({ hsk: hsk ? parseInt(hsk, 10) : undefined, limit: 200 })
            .then(res => {
                if (cancelled) return;
                setGrammarList(res.data);
            })
            .catch(() => {
                if (!cancelled) setGrammarList([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingList(false);
            });
        return () => {
            cancelled = true;
        };
    }, [hsk]);

    const allSelected = grammarList.length > 0 && grammarList.every(g => selected.has(g.id));

    const toggleOne = useCallback((id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        setSelected(prev => {
            if (grammarList.every(g => prev.has(g.id))) {
                const next = new Set(prev);
                grammarList.forEach(g => next.delete(g.id));
                return next;
            }
            const next = new Set(prev);
            grammarList.forEach(g => next.add(g.id));
            return next;
        });
    }, [grammarList]);

    const canStart = selected.size > 0 || !!hsk;

    const handleStart = useCallback(async () => {
        if (!canStart || starting) return;
        setStarting(true);
        setError('');
        try {
            const ids = Array.from(selected);
            const res = await startGrammarQuiz({
                grammarIds: ids,
                hsk: ids.length === 0 && hsk ? parseInt(hsk, 10) : undefined,
                limit,
            });
            if (!res.questions?.length) {
                setError('Chưa có câu hỏi cho lựa chọn này. Thử chọn ngữ pháp khác.');
                return;
            }
            setToken(res.token);
            setQuestions(res.questions);
            setIndex(0);
            setPicked(null);
            setAnswer(null);
            setResult(null);
            setPhase('quiz');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tạo được phiên trắc nghiệm');
        } finally {
            setStarting(false);
        }
    }, [canStart, starting, selected, hsk, limit]);

    const current = questions[index];

    const handlePick = useCallback(
        async (choice: string) => {
            if (picked !== null || grading || !current) return;
            setPicked(choice);
            setGrading(true);
            try {
                const res = await answerGrammarQuiz({ token, questionId: current.id, choice });
                setAnswer(res);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không chấm được câu trả lời');
                setPicked(null);
            } finally {
                setGrading(false);
            }
        },
        [picked, grading, current, token]
    );

    const handleNext = useCallback(async () => {
        if (index < questions.length - 1) {
            setIndex(i => i + 1);
            setPicked(null);
            setAnswer(null);
            return;
        }
        // Last question → finish.
        setFinishing(true);
        try {
            const res = await finishGrammarQuiz(token);
            setResult(res);
            setPhase('result');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không hoàn tất được phiên');
        } finally {
            setFinishing(false);
        }
    }, [index, questions.length, token]);

    const resetToSetup = useCallback(() => {
        setPhase('setup');
        setToken('');
        setQuestions([]);
        setIndex(0);
        setPicked(null);
        setAnswer(null);
        setResult(null);
        setError('');
    }, []);

    // ===================== RENDER =====================

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                        <Icon name="error" size="sm" />
                        <span>{error}</span>
                    </div>
                )}

                {phase === 'setup' && (
                    <>
                        {lessonMeta && (
                            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                                <Icon name="auto_stories" size="sm" className="text-[var(--primary)]" />
                                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">Ngữ pháp bài</span>
                                <span className="text-sm font-bold text-[var(--text-main)] truncate">{lessonMeta.title}</span>
                                <span className="text-xs text-[var(--text-muted)]">· HSK {lessonMeta.hsk_level}</span>
                            </div>
                        )}
                        <SetupView
                            hsk={hsk}
                            setHsk={setHsk}
                            limit={limit}
                            setLimit={setLimit}
                            grammarList={grammarList}
                            loadingList={loadingList}
                            selected={selected}
                            toggleOne={toggleOne}
                            toggleAll={toggleAll}
                            allSelected={allSelected}
                            canStart={canStart}
                            starting={starting}
                            onStart={handleStart}
                        />
                    </>
                )}

                {phase === 'quiz' && current && (
                    <QuizView
                        question={current}
                        index={index}
                        total={questions.length}
                        picked={picked}
                        answer={answer}
                        grading={grading}
                        finishing={finishing}
                        onPick={handlePick}
                        onNext={handleNext}
                    />
                )}

                {phase === 'result' && result && (
                    <ResultView
                        result={result}
                        onRetry={resetToSetup}
                        onExit={() => router.push('/practice')}
                    />
                )}
            </main>
            <Footer />
        </div>
    );
}

// ---------- Setup view ----------

function SetupView(props: {
    hsk: string;
    setHsk: (v: string) => void;
    limit: number;
    setLimit: (v: number) => void;
    grammarList: Grammar[];
    loadingList: boolean;
    selected: Set<number>;
    toggleOne: (id: number) => void;
    toggleAll: () => void;
    allSelected: boolean;
    canStart: boolean;
    starting: boolean;
    onStart: () => void;
}) {
    const {
        hsk, setHsk, limit, setLimit, grammarList, loadingList,
        selected, toggleOne, toggleAll, allSelected, canStart, starting, onStart,
    } = props;

    return (
        <>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-main)]">Trắc nghiệm ngữ pháp</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    Lọc theo HSK, chọn một hoặc nhiều điểm ngữ pháp, rồi bắt đầu.
                </p>
            </div>

            <Card hover={false} padding="md" className="mb-6">
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
                        <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Số câu hỏi</label>
                        <select
                            value={limit}
                            onChange={e => setLimit(parseInt(e.target.value, 10))}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                        >
                            {COUNT_OPTS.map(n => <option key={n} value={n}>{n} câu</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <Icon name="menu_book" size="sm" />
                    Chọn ngữ pháp {selected.size > 0 && <span className="text-[var(--primary)]">({selected.size})</span>}
                </h2>
                {grammarList.length > 0 && (
                    <button
                        onClick={toggleAll}
                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                        {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                )}
            </div>

            {loadingList ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)]">Đang tải ngữ pháp…</div>
            ) : grammarList.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)]">Không có ngữ pháp cho mức HSK này.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                    {grammarList.map(g => {
                        const isOn = selected.has(g.id);
                        return (
                            <button
                                key={g.id}
                                onClick={() => toggleOne(g.id)}
                                className={`group flex items-center gap-3 text-left p-3 rounded-xl border-2 transition-all ${
                                    isOn
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50'
                                }`}
                            >
                                <span
                                    className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                        isOn ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]'
                                    }`}
                                >
                                    {isOn && <Icon name="check" size="xs" />}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block font-semibold text-sm text-[var(--text-main)] truncate">{g.grammarPoint}</span>
                                    {g.patternFormula && (
                                        <span className="block text-xs text-[var(--text-muted)] truncate">{g.patternFormula}</span>
                                    )}
                                </span>
                                <HSKBadge level={g.hskLevel} />
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="sticky bottom-4">
                <Button fullWidth size="lg" onClick={onStart} disabled={!canStart || starting}>
                    {starting ? 'Đang tạo phiên…' : 'Bắt đầu'}
                    {!starting && <Icon name="play_arrow" size="sm" />}
                </Button>
                {!canStart && (
                    <p className="text-center text-xs text-[var(--text-muted)] mt-2">
                        Chọn ít nhất một ngữ pháp hoặc một mức HSK.
                    </p>
                )}
            </div>
        </>
    );
}

// ---------- Quiz view ----------

function QuizView(props: {
    question: GrammarQuizQuestion;
    index: number;
    total: number;
    picked: string | null;
    answer: GrammarQuizAnswerResult | null;
    grading: boolean;
    finishing: boolean;
    onPick: (choice: string) => void;
    onNext: () => void;
}) {
    const { question, index, total, picked, answer, grading, finishing, onPick, onNext } = props;
    const answered = answer !== null;
    const isLast = index === total - 1;
    const progress = Math.round(((index + (answered ? 1 : 0)) / total) * 100);

    return (
        <>
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                    <span className="flex items-center gap-1.5">
                        <HSKBadge level={question.hskLevel} />
                        <span className="font-medium text-[var(--text-main)]">{question.grammarPoint}</span>
                    </span>
                    <span>Câu {index + 1}/{total}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                    <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <Card hover={false} padding="lg" className="mb-4">
                <p className="text-lg font-semibold text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
                    {question.questionText}
                </p>
            </Card>

            <div className="grid grid-cols-1 gap-2.5 mb-4">
                {question.options.map((opt, i) => {
                    const isPicked = picked === opt;
                    const isCorrect = answered && answer!.correctAnswer === opt;
                    const isWrongPick = answered && isPicked && !answer!.correct;

                    let cls = 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50';
                    if (isCorrect) cls = 'border-emerald-500 bg-emerald-500/10';
                    else if (isWrongPick) cls = 'border-red-500 bg-red-500/10';
                    else if (answered) cls = 'border-[var(--border)] bg-[var(--surface)] opacity-60';

                    return (
                        <button
                            key={i}
                            onClick={() => onPick(opt)}
                            disabled={answered || grading}
                            className={`flex items-center gap-3 text-left p-4 rounded-xl border-2 transition-all disabled:cursor-default ${cls}`}
                        >
                            <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-muted)] text-sm font-bold flex items-center justify-center">
                                {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-1 text-base text-[var(--text-main)]">{opt}</span>
                            {isCorrect && <Icon name="check_circle" size="md" className="text-emerald-500" />}
                            {isWrongPick && <Icon name="cancel" size="md" className="text-red-500" />}
                        </button>
                    );
                })}
            </div>

            {answered && (
                <Card hover={false} padding="md" className="mb-4 border-l-4 border-l-[var(--primary)]">
                    <p className={`text-sm font-bold mb-1 ${answer!.correct ? 'text-emerald-500' : 'text-red-500'}`}>
                        {answer!.correct ? 'Chính xác!' : 'Chưa đúng'}
                    </p>
                    {answer!.explanation && (
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                            {answer!.explanation}
                        </p>
                    )}
                </Card>
            )}

            {answered && (
                <Button fullWidth size="lg" onClick={onNext} disabled={finishing}>
                    {finishing ? 'Đang tổng kết…' : isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
                    {!finishing && <Icon name={isLast ? 'flag' : 'arrow_forward'} size="sm" />}
                </Button>
            )}
        </>
    );
}

// ---------- Result view ----------

function ResultView(props: {
    result: GrammarQuizFinishResult;
    onRetry: () => void;
    onExit: () => void;
}) {
    const { result, onRetry, onExit } = props;
    const pct = result.score;
    const good = pct >= 80;
    const mid = pct >= 50 && pct < 80;

    return (
        <div className="max-w-md mx-auto text-center py-8">
            <div
                className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                    good ? 'bg-emerald-500/10 text-emerald-500' : mid ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                }`}
            >
                <Icon name={good ? 'emoji_events' : mid ? 'thumb_up' : 'replay'} size="xl" />
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-main)] mb-1">
                {good ? 'Tuyệt vời!' : mid ? 'Khá tốt!' : 'Cố lên nhé!'}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">Bạn đã hoàn thành phiên trắc nghiệm ngữ pháp.</p>

            <Card hover={false} padding="lg" className="mb-6">
                <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
                    <div className="px-2">
                        <p className="text-2xl font-bold text-[var(--text-main)]">{result.correct}/{result.total}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Đúng</p>
                    </div>
                    <div className="px-2">
                        <p className="text-2xl font-bold text-[var(--primary)]">{pct}%</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Điểm</p>
                    </div>
                    <div className="px-2">
                        <p className="text-2xl font-bold text-amber-500">+{result.xpEarned}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">XP</p>
                    </div>
                </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
                <Button fullWidth variant="secondary" onClick={onExit}>
                    <Icon name="arrow_back" size="sm" />
                    Về Luyện tập
                </Button>
                <Button fullWidth onClick={onRetry}>
                    <Icon name="replay" size="sm" />
                    Làm lại
                </Button>
            </div>
        </div>
    );
}

export default function GrammarQuizPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
            <GrammarQuizInner />
        </Suspense>
    );
}
