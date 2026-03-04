'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { fetchHskExamResult, getMediaUrl, type HskExamResult, type HskResultQuestion } from '@/lib/api';

const SECTION_TYPE_LABELS: Record<string, string> = {
    listening: 'Nghe hiểu',
    reading: 'Đọc hiểu',
    writing: 'Viết',
};

const SECTION_TYPE_ICONS: Record<string, string> = {
    listening: 'headphones',
    reading: 'auto_stories',
    writing: 'edit_note',
};

function ScoreCircle({ score, maxScore, passed }: { score: number; maxScore: number; passed: boolean }) {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const circumference = 2 * Math.PI * 58;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                {/* Background circle */}
                <circle cx="64" cy="64" r="58" fill="none" stroke="var(--border)" strokeWidth="8" />
                {/* Progress circle */}
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

function QuestionReview({ question, index }: { question: HskResultQuestion; index: number }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`border rounded-xl overflow-hidden transition-colors ${
            question.isCorrect === null
                ? 'border-[var(--border)] bg-[var(--surface)]'
                : question.isCorrect
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-red-500/30 bg-red-500/5'
        }`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 p-4 text-left"
            >
                {/* Status icon */}
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    question.isCorrect === null
                        ? 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                        : question.isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                }`}>
                    {question.isCorrect === null ? (index + 1) : question.isCorrect ? (
                        <Icon name="check" size="xs" />
                    ) : (
                        <Icon name="close" size="xs" />
                    )}
                </span>

                {/* Question text */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-main)] truncate">
                        <span className="font-medium">Câu {index + 1}:</span>{' '}
                        {question.questionText || '(Câu hỏi hình ảnh/âm thanh)'}
                    </p>
                </div>

                {/* Points */}
                <span className="flex-shrink-0 text-xs font-medium text-[var(--text-muted)]">
                    {question.pointsEarned}/{question.points}
                </span>

                <Icon name={expanded ? 'expand_less' : 'expand_more'} size="sm" className="text-[var(--text-muted)]" />
            </button>

            {expanded && (
                <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
                    <div className="pt-3 space-y-3">
                        {/* Question image */}
                        {question.questionImage && (
                            <img
                                src={getMediaUrl(question.questionImage)}
                                alt={`Câu ${index + 1}`}
                                className="max-h-40 rounded-lg border border-[var(--border)] object-contain"
                            />
                        )}

                        {/* Options with correct/wrong highlighting */}
                        {question.options && question.options.length > 0 && (
                            <div className="space-y-2">
                                {question.options.map((option, oIdx) => {
                                    const label = String.fromCharCode(65 + oIdx);
                                    const isUserAnswer = question.userAnswer === label;
                                    const isCorrectAnswer = question.correctAnswer === label;

                                    return (
                                        <div
                                            key={oIdx}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                                                isCorrectAnswer
                                                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                                                    : isUserAnswer && !isCorrectAnswer
                                                        ? 'bg-red-500/10 border border-red-500/30'
                                                        : 'bg-[var(--surface-secondary)]'
                                            }`}
                                        >
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                isCorrectAnswer
                                                    ? 'bg-emerald-500 text-white'
                                                    : isUserAnswer
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-[var(--border)] text-[var(--text-muted)]'
                                            }`}>
                                                {label}
                                            </span>
                                            <span className={`flex-1 ${
                                                isCorrectAnswer
                                                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                                    : isUserAnswer && !isCorrectAnswer
                                                        ? 'text-red-600 dark:text-red-400 line-through'
                                                        : 'text-[var(--text-secondary)]'
                                            }`}>
                                                {option}
                                            </span>
                                            {isCorrectAnswer && <Icon name="check_circle" size="xs" className="text-emerald-500" filled />}
                                            {isUserAnswer && !isCorrectAnswer && <Icon name="cancel" size="xs" className="text-red-500" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* For fill_blank / short_answer - show user answer vs correct */}
                        {(!question.options || question.options.length === 0) && (
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-muted)]">Đáp án của bạn:</span>
                                    <span className={question.isCorrect ? 'text-emerald-500 font-medium' : 'text-red-500 line-through'}>
                                        {question.userAnswer || '(Không trả lời)'}
                                    </span>
                                </div>
                                {!question.isCorrect && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--text-muted)]">Đáp án đúng:</span>
                                        <span className="text-emerald-500 font-medium">{question.correctAnswer}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Explanation */}
                        {question.explanation && (
                            <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                <p className="text-xs font-semibold text-blue-500 mb-1">Giải thích</p>
                                <p className="text-sm text-[var(--text-secondary)]">{question.explanation}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ExamResultPage() {
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
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load result';
                setError(message);
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

    if (error || !result) {
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

    // Compute section scores
    const sectionScores: { type: string; score: number; total: number; correct: number; count: number }[] = [];
    exam.sections.forEach(section => {
        const total = section.questions.reduce((sum, q) => sum + q.points, 0);
        const score = section.questions.reduce((sum, q) => sum + q.pointsEarned, 0);
        const correct = section.questions.filter(q => q.isCorrect).length;
        sectionScores.push({ type: section.section_type, score, total, correct, count: section.questions.length });
    });

    // All questions flat for review
    let questionIndex = 0;

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back link */}
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                    <Link href="/hsk-test" className="hover:text-[var(--primary)]">Luyện thi HSK</Link>
                    <Icon name="chevron_right" size="xs" />
                    <span className="text-[var(--text-main)]">Kết quả</span>
                </nav>

                {/* Score Card */}
                <div className={`rounded-2xl border-2 p-8 mb-8 ${
                    passed
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                }`}>
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        {/* Score circle */}
                        <ScoreCircle score={attempt.total_score} maxScore={attempt.max_score} passed={passed} />

                        {/* Score details */}
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-2xl font-bold text-[var(--text-main)] mb-1">{exam.title}</h1>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
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

                            {/* Stats row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-0.5">Đúng</p>
                                    <p className="text-lg font-bold text-emerald-500">{attempt.correct_count}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-0.5">Sai</p>
                                    <p className="text-lg font-bold text-red-500">{attempt.wrong_count}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-0.5">Bỏ trống</p>
                                    <p className="text-lg font-bold text-[var(--text-muted)]">{attempt.unanswered_count}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-0.5">Thời gian</p>
                                    <p className="text-lg font-bold text-[var(--text-main)]">{timeMinutes}:{timeSeconds.toString().padStart(2, '0')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Breakdown */}
                {sectionScores.length > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        {sectionScores.map(section => (
                            <div key={section.type} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon name={SECTION_TYPE_ICONS[section.type] || 'quiz'} size="sm" className="text-[var(--text-muted)]" />
                                    <h3 className="text-sm font-semibold text-[var(--text-main)]">
                                        {SECTION_TYPE_LABELS[section.type] || section.type}
                                    </h3>
                                </div>
                                <p className="text-2xl font-bold text-[var(--text-main)] mb-1">
                                    {section.score}<span className="text-sm font-normal text-[var(--text-muted)]">/{section.total}</span>
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {section.correct}/{section.count} câu đúng
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Question Review */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-[var(--text-main)] mb-4">Chi tiết từng câu</h2>
                    <div className="space-y-3">
                        {exam.sections.map(section => (
                            <div key={section.id}>
                                {exam.sections.length > 1 && (
                                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 mt-4">
                                        {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                                        {section.title ? ` - ${section.title}` : ''}
                                    </h3>
                                )}
                                {section.questions.map(q => {
                                    const idx = questionIndex++;
                                    return <QuestionReview key={q.id} question={q} index={idx} />;
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <Link
                        href={`/hsk-test/${attempt.exam_id}`}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                    >
                        <Icon name="replay" size="sm" />
                        Thi lại
                    </Link>
                    <Link
                        href="/hsk-test"
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                        <Icon name="list" size="sm" />
                        Danh sách đề thi
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
