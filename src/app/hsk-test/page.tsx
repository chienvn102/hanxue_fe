'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { fetchHskExams, fetchHskHistory, type HskExam, type HskExamAttempt } from '@/lib/api';

const HSK_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;

const HSK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
    2: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/30' },
    3: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
    4: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
    5: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
    6: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/30' },
};

const EXAM_TYPE_LABELS: Record<string, string> = {
    practice: 'Luyện tập',
    mock: 'Thi thử',
    official: 'Chính thức',
};

export default function HskTestPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [exams, setExams] = useState<HskExam[]>([]);
    const [history, setHistory] = useState<HskExamAttempt[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const params = selectedLevel > 0 ? { hsk: selectedLevel, limit: 50 } : { limit: 50 };
            const examRes = await fetchHskExams(params);
            setExams(examRes.data);

            if (isAuthenticated) {
                try {
                    const historyRes = await fetchHskHistory();
                    setHistory(historyRes.data);
                } catch {
                    // Not logged in or error - history is optional
                }
            }
        } catch (error) {
            console.error('Failed to load exams', error);
        } finally {
            setLoading(false);
        }
    }, [selectedLevel, isAuthenticated]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Get attempt info for an exam
    const getExamStatus = (examId: number) => {
        const attempts = history.filter(a => a.exam_id === examId);
        if (attempts.length === 0) return null;

        const completed = attempts.filter(a => a.status === 'completed');
        const inProgress = attempts.find(a => a.status === 'in_progress');
        const bestScore = completed.length > 0
            ? Math.max(...completed.map(a => a.total_score))
            : 0;
        const bestMaxScore = completed.length > 0
            ? completed.find(a => a.total_score === bestScore)?.max_score || 0
            : 0;
        const bestPassed = completed.some(a => a.is_passed);

        return { attempts: attempts.length, completed: completed.length, inProgress, bestScore, bestMaxScore, bestPassed };
    };

    const handleExamClick = (exam: HskExam) => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        router.push(`/hsk-test/${exam.id}`);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">Luyện thi HSK</h1>
                    <p className="text-[var(--text-secondary)]">Chọn đề thi phù hợp với trình độ của bạn</p>
                </div>

                {/* HSK Level Filter */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {HSK_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => setSelectedLevel(level)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                selectedLevel === level
                                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary-light)]'
                                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]'
                            }`}
                        >
                            {level === 0 ? 'Tất cả' : `HSK ${level}`}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-52 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
                        ))}
                    </div>
                ) : exams.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20">
                        <Icon name="quiz" size="xl" className="text-[var(--text-muted)] mb-4" />
                        <h2 className="text-xl font-semibold text-[var(--text-main)] mb-2">Chưa có đề thi</h2>
                        <p className="text-[var(--text-secondary)]">
                            {selectedLevel > 0
                                ? `Chưa có đề thi HSK ${selectedLevel}. Thử chọn level khác.`
                                : 'Chưa có đề thi nào được tạo.'}
                        </p>
                    </div>
                ) : (
                    /* Exam Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => {
                            const status = getExamStatus(exam.id);
                            const colors = HSK_COLORS[exam.hskLevel] || HSK_COLORS[1];

                            return (
                                <button
                                    key={exam.id}
                                    onClick={() => handleExamClick(exam)}
                                    className="text-left bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--primary)]/50 hover:shadow-lg transition-all duration-300 group"
                                >
                                    {/* Header row */}
                                    <div className="flex items-start justify-between mb-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${colors.bg} ${colors.text}`}>
                                            HSK {exam.hskLevel}
                                        </span>
                                        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                                            exam.examType === 'mock'
                                                ? 'bg-amber-500/10 text-amber-500'
                                                : exam.examType === 'official'
                                                    ? 'bg-red-500/10 text-red-500'
                                                    : 'bg-blue-500/10 text-blue-500'
                                        }`}>
                                            {EXAM_TYPE_LABELS[exam.examType] || exam.examType}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                                        {exam.title}
                                    </h3>

                                    {/* Description */}
                                    {exam.description && (
                                        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">{exam.description}</p>
                                    )}

                                    {/* Stats row */}
                                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mb-4">
                                        <span className="flex items-center gap-1">
                                            <Icon name="help_outline" size="xs" />
                                            {exam.totalQuestions} câu
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Icon name="schedule" size="xs" />
                                            {exam.durationMinutes} phút
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Icon name="flag" size="xs" />
                                            {exam.passingScore} điểm
                                        </span>
                                    </div>

                                    {/* Status badge */}
                                    {status ? (
                                        <div className={`flex items-center justify-between pt-4 border-t border-[var(--border)]`}>
                                            {status.inProgress ? (
                                                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-500">
                                                    <Icon name="pending" size="xs" />
                                                    Đang làm dở
                                                </span>
                                            ) : status.bestPassed ? (
                                                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-500">
                                                    <Icon name="check_circle" size="xs" filled />
                                                    Đạt
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                                                    <Icon name="cancel" size="xs" />
                                                    Chưa đạt
                                                </span>
                                            )}
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {status.completed > 0
                                                    ? `${status.completed} lần • Cao nhất: ${status.bestScore}/${status.bestMaxScore}`
                                                    : 'Chưa hoàn thành'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="pt-4 border-t border-[var(--border)]">
                                            <span className="text-sm text-[var(--text-muted)]">Chưa thi</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
