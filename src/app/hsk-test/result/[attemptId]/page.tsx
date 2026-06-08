'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import {
    fetchHskExamResult, getMediaUrl,
    type HskExamResult, type HskResultQuestion, type HskOption,
} from '@/lib/api';
import { playSfx } from '@/lib/sound';
import {
    ExamReviewShell,
    type ReviewSection,
    type NodeStatus,
    SECTION_TYPE_LABELS,
} from '@/components/hsk-test/ExamReviewShell';
import { HskTestProvider } from '@/components/hsk-test/HskTestContext';

const SECTION_TYPE_ICONS: Record<string, string> = {
    listening: 'headphones',
    reading: 'auto_stories',
    writing: 'edit_note',
};

const AI_GRADED_TYPES = new Set([
    'image_keyword_sentence',
    'short_essay',
    'summary_essay',
]);

function ScoreCircle({ score, maxScore, passed }: { score: number; maxScore: number; passed: boolean }) {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const circumference = 2 * Math.PI * 58;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="58" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                    cx="64" cy="64" r="58" fill="none"
                    stroke={passed ? '#10B981' : '#EF4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--text-main)]">{score}</span>
                <span className="text-xs text-[var(--text-muted)]">/ {maxScore}</span>
            </div>
        </div>
    );
}

/**
 * Single-question review body. Same content as the previous accordion but
 * rendered in-place inside ExamReviewShell. Status (correct / wrong /
 * unanswered) is reflected by the surrounding card border + status pill,
 * mirroring the per-card colors of the old accordion.
 */
function ResultQuestionBody({
    question, questionNumber, sectionInstructions,
}: {
    question: HskResultQuestion;
    questionNumber: number;
    sectionInstructions?: string;
}) {
    const isAiGraded = AI_GRADED_TYPES.has(question.questionType);
    const suggestedAnswer = question.aiFeedback?.suggestedAnswer || question.correctAnswer;
    const borderClass =
        question.isCorrect === null
            ? 'border-[var(--border)] bg-[var(--surface)]'
            : question.isCorrect
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-red-500/40 bg-red-500/5';

    const statusPill = question.isCorrect === null
        ? <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">Chưa trả lời / chưa chấm</span>
        : question.isCorrect
            ? <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><Icon name="check_circle" size="xs" filled />Đúng</span>
            : <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 font-semibold flex items-center gap-1"><Icon name="cancel" size="xs" filled />Sai</span>;

    return (
        <div className={`rounded-xl border-2 ${borderClass} p-4 space-y-3`}>
            {sectionInstructions && (
                <p className="text-sm text-[var(--text-secondary)] italic">{sectionInstructions}</p>
            )}

            {/* Header pill row */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="font-bold text-[var(--text-secondary)]">Câu {questionNumber}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-muted)] italic">{question.questionType}</span>
                {statusPill}
                <span className="ml-auto text-[var(--text-muted)]">
                    {question.pointsEarned}/{question.points} điểm
                </span>
            </div>

            {/* Passage */}
            {question.passage && (
                <div className="bg-[var(--surface)] rounded-lg p-3 text-sm hanzi border border-[var(--border)] leading-relaxed">
                    {question.passage}
                </div>
            )}

            {/* Statement */}
            {question.statement && (
                <div className="bg-[var(--surface-secondary)] rounded-lg p-3 text-base hanzi border-l-4 border-[var(--primary)]">
                    <span className="text-xs text-[var(--primary)] mr-2">★</span>
                    {question.statement}
                </div>
            )}

            {/* Transcript (collapsible — usually long) */}
            {question.transcript && (
                <details className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/30">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                        <Icon name="record_voice_over" size="xs" />
                        Transcript audio
                    </summary>
                    <div className="px-3 pb-3 text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {question.transcript}
                    </div>
                </details>
            )}

            {/* Question text (if different from statement) */}
            {question.questionText && question.questionText !== question.statement && (
                <div className="text-base hanzi">{question.questionText}</div>
            )}

            {/* Question image */}
            {question.questionImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={getMediaUrl(question.questionImage)}
                    alt={`Câu ${questionNumber}`}
                    className="max-h-48 rounded-lg border border-[var(--border)] object-contain"
                />
            )}

            {/* Options with correct/wrong highlighting */}
            {question.options && question.options.length > 0 && (
                <div className="space-y-2">
                    {question.options.map((option, oIdx) => {
                        const opt = option as unknown as string | HskOption;
                        const optionText = typeof opt === 'string' ? opt : (opt?.text || '');
                        const label = (typeof opt === 'object' && opt?.label) || String.fromCharCode(65 + oIdx);
                        const isUserAnswer = question.userAnswer === label;
                        const isCorrectAnswer = question.correctAnswer === label;

                        return (
                            <div
                                key={oIdx}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border ${
                                    isCorrectAnswer
                                        ? 'bg-emerald-500/10 border-emerald-500/40'
                                        : isUserAnswer && !isCorrectAnswer
                                            ? 'bg-red-500/10 border-red-500/40'
                                            : 'bg-[var(--surface-secondary)] border-transparent'
                                }`}
                            >
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isCorrectAnswer
                                        ? 'bg-emerald-500 text-white'
                                        : isUserAnswer
                                            ? 'bg-red-500 text-white'
                                            : 'bg-[var(--border)] text-[var(--text-muted)]'
                                }`}>
                                    {label}
                                </span>
                                <span className={`flex-1 hanzi ${
                                    isCorrectAnswer
                                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                        : isUserAnswer && !isCorrectAnswer
                                            ? 'text-red-600 dark:text-red-400 line-through'
                                            : 'text-[var(--text-secondary)]'
                                }`}>
                                    {optionText}
                                </span>
                                {isCorrectAnswer && <Icon name="check_circle" size="xs" className="text-emerald-500" filled />}
                                {isUserAnswer && !isCorrectAnswer && <Icon name="cancel" size="xs" className="text-red-500" />}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Text-entry questions */}
            {(!question.options || question.options.length === 0) && (
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[var(--text-muted)]">Đáp án của bạn:</span>
                        <span className={question.isCorrect ? 'text-emerald-500 font-medium hanzi' : 'text-red-500 line-through hanzi'}>
                            {question.userAnswer || '(Không trả lời)'}
                        </span>
                    </div>
                    {question.isCorrect === null && isAiGraded && (
                        <div className="text-[var(--text-muted)] italic text-xs">
                            AI chưa chấm câu này. Câu trả lời đã được lưu.
                        </div>
                    )}
                    {question.aiScore !== null && question.aiScore !== undefined && (
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)]">Điểm AI:</span>
                            <span className="font-semibold text-[var(--text-main)]">{question.aiScore}/100</span>
                        </div>
                    )}
                    {question.aiFeedback?.feedbackVi && (
                        <div className="rounded-lg bg-[var(--surface-secondary)] p-3 text-[var(--text-secondary)] leading-relaxed">
                            {question.aiFeedback.feedbackVi}
                        </div>
                    )}
                    {!question.isCorrect && suggestedAnswer && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[var(--text-muted)]">Đáp án đúng:</span>
                            <span className="text-emerald-500 font-medium hanzi">{suggestedAnswer}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Explanation */}
            {question.explanation && (
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                    <p className="text-xs font-semibold text-blue-500 mb-1 flex items-center gap-1">
                        <Icon name="lightbulb" size="xs" />
                        Giải thích
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {question.explanation}
                    </p>
                </div>
            )}
        </div>
    );
}

function ExamResultInner() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const attemptId = Number(params.attemptId);

    const [result, setResult] = useState<HskExamResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        async function load() {
            try {
                setLoading(true);
                const data = await fetchHskExamResult(attemptId);
                setResult(data);
                if (data?.attempt) {
                    playSfx(data.attempt.is_passed ? 'complete' : 'wrong');
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load result');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [attemptId, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                </div>
            </div>
        );
    }

    if (error || !result || !result.attempt || !result.exam || !Array.isArray(result.exam.sections)) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <Icon name="error" size="xl" className="text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Lỗi</h1>
                    <p className="text-[var(--text-secondary)] mb-4">{error || 'Không tìm thấy kết quả'}</p>
                    <Link href="/hsk-test" className="text-[var(--primary)] hover:underline">Quay lại danh sách</Link>
                </div>
            </div>
        );
    }

    const { attempt, exam } = result;
    const passed = attempt.is_passed;
    const totalTime = attempt.time_spent_seconds;
    const timeMinutes = Math.floor(totalTime / 60);
    const timeSeconds = totalTime % 60;

    // Section-level scores for the breakdown row above the shell.
    const sectionScores: { type: string; score: number; total: number; correct: number; count: number }[] = [];
    exam.sections.forEach(section => {
        const qs = Array.isArray(section.questions) ? section.questions : [];
        const total = qs.reduce((sum, q) => sum + (q.points || 0), 0);
        const score = qs.reduce((sum, q) => sum + (q.pointsEarned || 0), 0);
        const correct = qs.filter(q => q.isCorrect).length;
        sectionScores.push({ type: section.section_type, score, total, correct, count: qs.length });
    });

    // Adapt to the shell's generic ReviewSection<Q> shape. HskResultSection
    // lacks `groups` (BE doesn't include them in the result payload), so
    // clusters fall back to "no group" mode automatically — still grouped
    // visually in the map by section.
    const sections: ReviewSection<HskResultQuestion>[] = exam.sections.map(s => ({
        id: s.id,
        section_type: s.section_type,
        title: s.title,
        questions: Array.isArray(s.questions) ? s.questions : [],
    }));

    // Map node colors by result state. `current` is handled by the shell.
    const nodeStatus = (q: HskResultQuestion): NodeStatus => {
        if (q.isCorrect === null) return 'unanswered';
        return q.isCorrect ? 'correct' : 'wrong';
    };

    const scoreCard = (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className={`rounded-2xl border-2 p-6 mb-6 ${
                passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
            }`}>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ScoreCircle score={attempt.total_score} maxScore={attempt.max_score} passed={passed} />
                    <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-xl font-bold text-[var(--text-main)] mb-1">{exam.title}</h1>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                                passed
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/15 text-red-600 dark:text-red-400'
                            }`}>
                                <Icon name={passed ? 'check_circle' : 'cancel'} size="xs" filled />
                                {passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                            </span>
                            <span className="text-sm text-[var(--text-muted)]">
                                (Cần {exam.passingScore} điểm)
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Stat label="Đúng" value={attempt.correct_count} valueClass="text-emerald-500" />
                            <Stat label="Sai" value={attempt.wrong_count} valueClass="text-red-500" />
                            <Stat label="Bỏ trống" value={attempt.unanswered_count} valueClass="text-[var(--text-muted)]" />
                            <Stat
                                label="Thời gian"
                                value={`${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`}
                                valueClass="text-[var(--text-main)]"
                            />
                        </div>
                    </div>
                </div>

                {sectionScores.length > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-[var(--border)]">
                        {sectionScores.map(section => (
                            <div key={section.type} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name={SECTION_TYPE_ICONS[section.type] || 'quiz'} size="sm" className="text-[var(--text-muted)]" />
                                    <h3 className="text-sm font-semibold text-[var(--text-main)]">
                                        {SECTION_TYPE_LABELS[section.type] || section.type}
                                    </h3>
                                </div>
                                <p className="text-xl font-bold text-[var(--text-main)] mb-0.5">
                                    {section.score}<span className="text-sm font-normal text-[var(--text-muted)]">/{section.total}</span>
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {section.correct}/{section.count} câu đúng
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const actionButtons = (
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
                href={`/hsk-test/${attempt.exam_id}`}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
                <Icon name="replay" size="sm" />
                Thi lại
            </Link>
            <Link
                href={`/hsk-test/${attempt.exam_id}/answers`}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors"
            >
                <Icon name="task_alt" size="sm" />
                Xem đáp án đầy đủ
            </Link>
            <Link
                href="/hsk-test"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors"
            >
                <Icon name="list" size="sm" />
                Danh sách đề thi
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <ExamReviewShell<HskResultQuestion>
                title={exam.title}
                hskLevel={exam.hskLevel}
                subtitle="Kết quả bài làm"
                breadcrumb={[
                    { href: '/hsk-test', label: 'Luyện thi HSK' },
                    { label: 'Kết quả' },
                ]}
                sections={sections}
                nodeStatus={nodeStatus}
                headerSlot={scoreCard}
                footerSlot={actionButtons}
                renderQuestion={(q, info) => {
                    const isSectionFirst = info.section.questions[0]?.id === q.id;
                    return (
                        <ResultQuestionBody
                            question={q}
                            questionNumber={info.questionNumber}
                            sectionInstructions={isSectionFirst ? info.section.instructions : undefined}
                        />
                    );
                }}
            />

            <Footer />
        </div>
    );
}

function Stat({ label, value, valueClass }: { label: string; value: number | string; valueClass: string }) {
    return (
        <div>
            <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
            <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
        </div>
    );
}

export default function ExamResultPage() {
    return (
        <HskTestProvider>
            <ExamResultInner />
        </HskTestProvider>
    );
}
