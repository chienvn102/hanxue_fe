'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { startHskExam, submitHskAnswer, finishHskExam, getMediaUrl, type HskExamStartResponse, type HskQuestion, type HskSection } from '@/lib/api';
import { HskTestProvider, useHskTest } from '@/components/hsk-test/HskTestContext';
import { QuestionRenderer } from '@/components/hsk-test/QuestionRenderer';
import { GroupHeader } from '@/components/hsk-test/GroupHeader';
import { FullTestAudio } from '@/components/hsk-test/FullTestAudio';

// Flatten all questions across sections into a single ordered list
interface FlatQuestion extends HskQuestion {
    sectionIndex: number;
    sectionType: string;
    sectionTitle?: string;
    globalIndex: number;
}

function flattenQuestions(sections: HskSection[]): FlatQuestion[] {
    const result: FlatQuestion[] = [];
    sections.forEach((section, sIdx) => {
        section.questions.forEach(q => {
            result.push({
                ...q,
                sectionIndex: sIdx,
                sectionType: section.section_type,
                sectionTitle: section.title || undefined,
                globalIndex: result.length,
            });
        });
    });
    return result;
}

// Format seconds to mm:ss
function formatTime(seconds: number): string {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SECTION_TYPE_LABELS: Record<string, string> = {
    listening: 'Nghe',
    reading: 'Đọc',
    writing: 'Viết',
};

export default function ExamTakingPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const examId = Number(params.examId);

    // Core state
    const [exam, setExam] = useState<HskExamStartResponse | null>(null);
    const [questions, setQuestions] = useState<FlatQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [flagged, setFlagged] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [showGrid, setShowGrid] = useState(false);

    // Timer
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoFinishCalledRef = useRef(false);

    // Track answer submission to server
    const pendingSubmitRef = useRef<Record<number, string>>({});
    const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const submittingRef = useRef(false);

    // Audio play count tracking: key = "section:{sectionId}" or "question:{questionId}"
    const [audioPlays, setAudioPlays] = useState<Record<string, number>>({});
    // Track whether a play event is a fresh start (not a resume)
    const audioFreshPlayRef = useRef<Record<string, boolean>>({});

    // Load exam
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        async function load() {
            try {
                setLoading(true);
                const data = await startHskExam(examId);
                setExam(data);

                const flat = flattenQuestions(data.sections);
                setQuestions(flat);

                // Restore saved answers (resume support)
                if (data.savedAnswers && data.savedAnswers.length > 0) {
                    const restored: Record<number, string> = {};
                    data.savedAnswers.forEach(sa => {
                        restored[sa.questionId] = sa.answer;
                    });
                    setAnswers(restored);
                }

                // Calculate remaining time
                const totalSeconds = data.duration_minutes * 60;
                const startedAt = new Date(data.startedAt).getTime();
                const elapsed = Math.floor((Date.now() - startedAt) / 1000);
                const remaining = Math.max(0, totalSeconds - elapsed);
                setTimeLeft(remaining);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load exam';
                setError(message);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [examId, isAuthenticated, router]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft <= 0 || !exam) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    // Auto-submit when time runs out (use ref to avoid stale closure)
                    if (!autoFinishCalledRef.current) {
                        autoFinishCalledRef.current = true;
                        handleFinishRef.current();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam]);

    // Submit answer to server (debounced)
    const submitAnswerToServer = useCallback((questionId: number, answer: string) => {
        if (!exam) return;
        pendingSubmitRef.current[questionId] = answer;

        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = setTimeout(async () => {
            const pending = { ...pendingSubmitRef.current };
            pendingSubmitRef.current = {};

            for (const [qId, ans] of Object.entries(pending)) {
                try {
                    await submitHskAnswer(exam.attemptId, Number(qId), ans);
                } catch {
                    // Silently fail — answer is still in local state
                }
            }
        }, 500);
    }, [exam]);

    const handleSelectAnswer = (questionId: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        submitAnswerToServer(questionId, answer);
    };

    const handleToggleFlag = (questionId: number) => {
        setFlagged(prev => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
    };

    const handleFinish = useCallback(async () => {
        if (!exam) return;
        if (submittingRef.current) return;
        submittingRef.current = true;

        // Flush pending answers
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
        const pending = { ...pendingSubmitRef.current };
        pendingSubmitRef.current = {};

        setSubmitting(true);
        setSubmitError('');
        try {
            // Submit any remaining pending answers
            for (const [qId, ans] of Object.entries(pending)) {
                await submitHskAnswer(exam.attemptId, Number(qId), ans);
            }

            const result = await finishHskExam(exam.attemptId);
            if (timerRef.current) clearInterval(timerRef.current);

            if (result.success) {
                router.push(`/hsk-test/result/${exam.attemptId}`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to finish exam';
            setSubmitError(message);
            setSubmitting(false);
            submittingRef.current = false;
        } finally {
            setShowConfirmSubmit(false);
        }
    }, [exam, router]);

    // Keep a ref to handleFinish so the timer interval always calls the latest version
    const handleFinishRef = useRef(handleFinish);
    useEffect(() => {
        handleFinishRef.current = handleFinish;
    }, [handleFinish]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)]">Đang tải đề thi...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !exam || questions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-8">
                <Icon name="error" size="xl" className="text-red-400 mb-4" />
                <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Không thể tải đề thi</h1>
                <p className="text-[var(--text-secondary)] mb-4">{error || 'Đề thi không có câu hỏi nào.'}</p>
                <button onClick={() => router.push('/hsk-test')} className="text-[var(--primary)] hover:underline">
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = questions.length;
    const isWarning = timeLeft > 0 && timeLeft <= 300; // 5 minutes warning

    const testMode: 'practice' | 'full' = exam.exam_type === 'practice' ? 'practice' : 'full';
    const currentSection = exam.sections[currentQuestion.sectionIndex];
    const showSectionAudio =
        testMode === 'full' &&
        currentSection?.section_type === 'listening' &&
        Boolean(currentSection.audio_url);

    return (
        <HskTestProvider testMode={testMode}>
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Left - Exam info */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setShowGrid(!showGrid)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-main)] text-sm md:hidden"
                        >
                            <Icon name="grid_view" size="xs" />
                        </button>
                        <h1 className="text-sm font-semibold text-[var(--text-main)] truncate hidden sm:block">
                            {exam.title}
                        </h1>
                        <span className="text-xs text-[var(--text-muted)] hidden sm:block">
                            {answeredCount}/{totalQuestions} đã trả lời
                        </span>
                        <PinyinToggle />
                    </div>

                    {/* Center - Timer */}
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-lg font-bold ${
                        isWarning
                            ? 'bg-red-500/10 text-red-500 animate-pulse'
                            : 'bg-[var(--surface-secondary)] text-[var(--text-main)]'
                    }`}>
                        <Icon name="schedule" size="sm" />
                        {formatTime(timeLeft)}
                    </div>

                    {/* Right - Submit */}
                    <button
                        onClick={() => setShowConfirmSubmit(true)}
                        disabled={submitting}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                    >
                        Nộp bài
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-0.5 bg-[var(--border)]">
                    <div
                        className="h-full bg-[var(--primary)] transition-all duration-300"
                        style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                    />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Question Grid Sidebar - Desktop always, mobile toggleable */}
                <aside className={`${showGrid ? 'fixed inset-0 z-40 bg-black/50 md:relative md:bg-transparent' : 'hidden'} md:block`}>
                    <div className={`${showGrid ? 'absolute left-0 top-0 bottom-0 w-72' : ''} md:relative md:w-64 lg:w-72 border-r border-[var(--border)] bg-[var(--surface)] p-4 overflow-y-auto`}
                         style={{ height: showGrid ? '100vh' : 'calc(100vh - 57px)', position: showGrid ? undefined : 'sticky', top: showGrid ? undefined : '57px' }}>
                        {/* Mobile close button */}
                        {showGrid && (
                            <button onClick={() => setShowGrid(false)} className="md:hidden absolute top-3 right-3 p-1 text-[var(--text-muted)]">
                                <Icon name="close" size="sm" />
                            </button>
                        )}

                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                            Danh sách câu hỏi
                        </h3>

                        {/* Section groups */}
                        {exam.sections.map((section, sIdx) => {
                            const sectionQuestions = questions.filter(q => q.sectionIndex === sIdx);

                            // Cluster contiguous questions sharing same groupId
                            const clusters: { groupId: number | null | undefined; items: typeof sectionQuestions }[] = [];
                            for (const q of sectionQuestions) {
                                const last = clusters[clusters.length - 1];
                                if (last && last.groupId && last.groupId === q.groupId) {
                                    last.items.push(q);
                                } else {
                                    clusters.push({ groupId: q.groupId, items: [q] });
                                }
                            }

                            const renderQ = (q: typeof sectionQuestions[number]) => {
                                const isAnswered = answers[q.id] !== undefined;
                                const isCurrent = q.globalIndex === currentIndex;
                                const isFlagged = flagged.has(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => { setCurrentIndex(q.globalIndex); setShowGrid(false); }}
                                        className={`relative w-full aspect-square rounded-lg text-xs font-medium transition-all duration-150 ${
                                            isCurrent
                                                ? 'bg-[var(--primary)] text-white ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]'
                                                : isAnswered
                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                                        }`}
                                    >
                                        {q.questionNumber}
                                        {isFlagged && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
                                        )}
                                    </button>
                                );
                            };

                            return (
                                <div key={section.id} className="mb-4">
                                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                                        {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                                        {section.title ? `: ${section.title}` : ''}
                                    </p>
                                    {clusters.map((cluster, cIdx) => {
                                        const group = cluster.groupId
                                            ? section.groups.find(g => g.id === cluster.groupId)
                                            : null;
                                        if (group) {
                                            return (
                                                <div
                                                    key={cIdx}
                                                    className="mb-2 border-l-2 border-purple-400 pl-2 py-1 rounded-r bg-purple-500/5"
                                                >
                                                    <p
                                                        className="text-[10px] text-purple-600 dark:text-purple-400 italic mb-1 truncate"
                                                        title={group.title_vi || group.group_type}
                                                    >
                                                        🔗 {group.title_vi || group.group_type}
                                                    </p>
                                                    <div className="grid grid-cols-5 gap-1.5">
                                                        {cluster.items.map(renderQ)}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        // Standalone questions (no group): merge into one grid block
                                        return (
                                            <div key={cIdx} className="grid grid-cols-5 gap-1.5 mb-2">
                                                {cluster.items.map(renderQ)}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {/* Legend */}
                        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2 text-xs text-[var(--text-muted)]">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-emerald-500/15" />
                                <span>Đã trả lời ({answeredCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-[var(--surface-secondary)]" />
                                <span>Chưa trả lời ({totalQuestions - answeredCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="relative w-4 h-4 rounded bg-[var(--surface-secondary)]">
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
                                </span>
                                <span>Đánh dấu ({flagged.size})</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile overlay click-to-close */}
                    {showGrid && <div className="md:hidden absolute inset-0 -z-10" onClick={() => setShowGrid(false)} />}
                </aside>

                {/* Question Area */}
                <div className="flex-1 flex flex-col">
                    {/* Section-level merged audio cho full test mode (mock/official) */}
                    {showSectionAudio && currentSection && (
                        <FullTestAudio
                            audioUrl={currentSection.audio_url!}
                            questions={currentSection.questions}
                            sectionTitle={currentSection.title || `Phần ${currentSection.section_order}`}
                        />
                    )}

                    {/* Submit error banner (inline, not full-page) */}
                    {submitError && (
                        <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                            <Icon name="error" size="sm" className="text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{submitError}</p>
                            <button
                                onClick={() => { setSubmitError(''); handleFinish(); }}
                                className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline flex-shrink-0"
                            >
                                Thử lại
                            </button>
                            <button
                                onClick={() => setSubmitError('')}
                                className="p-0.5 text-red-400 hover:text-red-600"
                            >
                                <Icon name="close" size="xs" />
                            </button>
                        </div>
                    )}
                    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Section + Question number */}
                        <div className="flex items-center gap-3 mb-6">
                            <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-md ${
                                currentQuestion.sectionType === 'listening'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : currentQuestion.sectionType === 'reading'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-purple-500/10 text-purple-500'
                            }`}>
                                {SECTION_TYPE_LABELS[currentQuestion.sectionType] || currentQuestion.sectionType}
                            </span>
                            <span className="text-sm text-[var(--text-secondary)]">
                                Câu {currentIndex + 1}/{totalQuestions}
                            </span>
                            <button
                                onClick={() => handleToggleFlag(currentQuestion.id)}
                                className={`ml-auto p-1.5 rounded-lg transition-colors ${
                                    flagged.has(currentQuestion.id)
                                        ? 'text-amber-500 bg-amber-500/10'
                                        : 'text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10'
                                }`}
                                title="Đánh dấu câu hỏi"
                            >
                                <Icon name="flag" size="sm" filled={flagged.has(currentQuestion.id)} />
                            </button>
                        </div>

                        {/* Group header (image grid / word bank / reply bank / passage) — chỉ render trước câu đầu của cụm cùng group */}
                        {(() => {
                            const section = exam.sections[currentQuestion.sectionIndex];
                            const groupId = currentQuestion.groupId;
                            if (!groupId || !section.groups) return null;
                            // Chỉ hiện group header nếu câu hiện tại là câu ĐẦU TIÊN trong section có group_id này
                            const firstOfGroup = section.questions.find(q => q.groupId === groupId);
                            if (!firstOfGroup || firstOfGroup.id !== currentQuestion.id) return null;
                            const group = section.groups.find(g => g.id === groupId);
                            if (!group) return null;
                            return <GroupHeader group={group} />;
                        })()}

                        {/* Question content + answer (rendered by per-type component) */}
                        <QuestionRenderer
                            question={currentQuestion}
                            group={(() => {
                                const section = exam.sections[currentQuestion.sectionIndex];
                                if (!currentQuestion.groupId || !section.groups) return undefined;
                                return section.groups.find(g => g.id === currentQuestion.groupId);
                            })()}
                            value={answers[currentQuestion.id] || ''}
                            onChange={v => handleSelectAnswer(currentQuestion.id, v)}
                        />
                    </div>

                    {/* Bottom Navigation */}
                    <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
                        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Icon name="arrow_back" size="xs" />
                                Câu trước
                            </button>

                            <span className="text-sm text-[var(--text-muted)] hidden sm:block">
                                {answeredCount}/{totalQuestions} đã trả lời
                            </span>

                            <button
                                onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
                                disabled={currentIndex === totalQuestions - 1}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Câu sau
                                <Icon name="arrow_forward" size="xs" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Submit Modal */}
            {showConfirmSubmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <Icon name="warning" size="md" className="text-amber-500" />
                            </div>
                            <h2 className="text-lg font-bold text-[var(--text-main)]">Xác nhận nộp bài</h2>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Đã trả lời:</span>
                                <span className="font-medium text-[var(--text-main)]">{answeredCount}/{totalQuestions}</span>
                            </div>
                            {totalQuestions - answeredCount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Chưa trả lời:</span>
                                    <span className="font-medium text-red-500">{totalQuestions - answeredCount} câu</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Thời gian còn:</span>
                                <span className="font-medium text-[var(--text-main)]">{formatTime(timeLeft)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Đánh dấu:</span>
                                <span className="font-medium text-amber-500">{flagged.size} câu</span>
                            </div>
                        </div>

                        {totalQuestions - answeredCount > 0 && (
                            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-3 mb-4">
                                Bạn còn {totalQuestions - answeredCount} câu chưa trả lời. Những câu chưa trả lời sẽ được tính 0 điểm.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmSubmit(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                            >
                                Tiếp tục làm
                            </button>
                            <button
                                onClick={() => handleFinish()}
                                disabled={submitting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Đang nộp...' : 'Nộp bài'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </HskTestProvider>
    );
}

/**
 * Toggle "Highlight nội dung" — bật/tắt hiện pinyin trên đầu chữ Hán.
 * Phải nằm INSIDE HskTestProvider để dùng useHskTest().
 */
function PinyinToggle() {
    const { showPinyin, setShowPinyin } = useHskTest();
    return (
        <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showPinyin
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
            title="Hiện/ẩn pinyin"
            type="button"
        >
            <Icon name={showPinyin ? 'visibility' : 'visibility_off'} size="xs" />
            <span className="hidden md:inline">Pinyin</span>
        </button>
    );
}
