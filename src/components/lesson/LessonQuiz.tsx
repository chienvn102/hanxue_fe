'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import {
    startLessonQuiz, answerLessonQuiz, finishLessonQuiz,
    type LessonQuizQuestion, type LessonQuizFinishResult,
} from '@/lib/api';

interface Props {
    lessonId: number;
    /** Called after the quiz is finished so the parent can refresh lesson progress. */
    onFinished?: (result: LessonQuizFinishResult) => void;
}

type Phase = 'idle' | 'loading' | 'active' | 'done';

export default function LessonQuiz({ lessonId, onFinished }: Props) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState('');
    const [questions, setQuestions] = useState<LessonQuizQuestion[]>([]);
    const [index, setIndex] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);
    const [answer, setAnswer] = useState<{ correct: boolean; correctAnswer: string; explanation: string } | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [summary, setSummary] = useState<LessonQuizFinishResult | null>(null);
    const [busy, setBusy] = useState(false);

    const start = async () => {
        try {
            setPhase('loading');
            setError(null);
            const res = await startLessonQuiz(lessonId);
            setToken(res.token);
            setQuestions(res.questions);
            setIndex(0);
            setPicked(null);
            setAnswer(null);
            setCorrectCount(0);
            setSummary(null);
            setPhase('active');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tạo quiz');
            setPhase('idle');
        }
    };

    const choose = async (choice: string) => {
        if (answer || busy) return;
        const q = questions[index];
        try {
            setBusy(true);
            setPicked(choice);
            const r = await answerLessonQuiz(lessonId, { token, questionId: q.id, choice });
            setAnswer(r);
            if (r.correct) setCorrectCount((c) => c + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi chấm câu trả lời');
            setPicked(null);
        } finally {
            setBusy(false);
        }
    };

    const next = async () => {
        if (index < questions.length - 1) {
            setIndex((i) => i + 1);
            setPicked(null);
            setAnswer(null);
            return;
        }
        // last question → finish
        try {
            setBusy(true);
            const res = await finishLessonQuiz(lessonId, token);
            setSummary(res);
            setPhase('done');
            onFinished?.(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi hoàn tất quiz');
        } finally {
            setBusy(false);
        }
    };

    if (phase === 'idle' || phase === 'loading') {
        return (
            <div className="p-4 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5">
                <div className="flex items-center gap-2 mb-2">
                    <Icon name="quiz" size="sm" className="text-[var(--primary)]" />
                    <span className="text-sm font-bold text-[var(--text-main)]">Trắc nghiệm cuối bài</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                    Câu hỏi từ vựng + ngữ pháp của bài. Điểm quiz tính 50% điểm đạt của bài (≥ 70% để mở bài kế).
                </p>
                {error && <p className="text-xs text-[var(--error)] mb-2">{error}</p>}
                <Button onClick={start} disabled={phase === 'loading'} className="bg-[var(--primary)] text-white">
                    <Icon name={phase === 'loading' ? 'hourglass_top' : 'play_arrow'} size="sm" />
                    {phase === 'loading' ? 'Đang tạo...' : 'Bắt đầu quiz'}
                </Button>
            </div>
        );
    }

    if (phase === 'done' && summary) {
        const pct = summary.score;
        return (
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center space-y-3">
                <div className={`text-4xl font-bold ${pct >= 70 ? 'text-emerald-600' : 'text-amber-500'}`}>{pct}%</div>
                <p className="text-sm text-[var(--text-secondary)]">
                    Đúng {summary.correct}/{summary.total} câu
                    {typeof summary.lessonScore === 'number' && (
                        <> · Điểm bài: <span className="font-semibold">{summary.lessonScore}%</span></>
                    )}
                </p>
                {summary.lessonCompleted ? (
                    <p className="text-sm text-emerald-600 inline-flex items-center gap-1">
                        <Icon name="check_circle" size="sm" /> Đã hoàn thành bài học!
                    </p>
                ) : summary.lessonPassed ? (
                    <p className="text-sm text-emerald-600">Quiz đạt — hoàn tất các phần còn lại để xong bài.</p>
                ) : (
                    <p className="text-sm text-amber-600">Chưa đạt 70% — làm lại để mở bài tiếp theo.</p>
                )}
                <Button onClick={start} className="bg-[var(--primary)] text-white">
                    <Icon name="refresh" size="sm" /> Làm lại
                </Button>
            </div>
        );
    }

    // active
    const q = questions[index];
    return (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Câu {index + 1}/{questions.length}</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--surface-secondary)]">
                    {q.kind === 'vocab' ? 'Từ vựng' : 'Ngữ pháp'}
                </span>
            </div>
            <p className="text-base font-medium text-[var(--text-main)] hanzi">{q.questionText}</p>

            <div className="grid gap-2">
                {q.options.map((opt) => {
                    const isPicked = picked === opt;
                    const isCorrect = answer?.correctAnswer === opt;
                    let cls = 'border-[var(--border)] hover:border-[var(--primary)]/50';
                    if (answer) {
                        if (isCorrect) cls = 'border-emerald-500 bg-emerald-500/10';
                        else if (isPicked) cls = 'border-red-500 bg-red-500/10';
                        else cls = 'border-[var(--border)] opacity-60';
                    }
                    return (
                        <button
                            key={opt}
                            onClick={() => choose(opt)}
                            disabled={!!answer || busy}
                            className={`text-left px-4 py-3 rounded-lg border transition-colors hanzi text-[var(--text-main)] ${cls}`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>

            {answer && (
                <div className="p-3 rounded-lg bg-[var(--background)] space-y-1">
                    <p className={`text-sm font-semibold ${answer.correct ? 'text-emerald-600' : 'text-red-500'}`}>
                        {answer.correct ? 'Chính xác!' : `Đáp án đúng: ${answer.correctAnswer}`}
                    </p>
                    {answer.explanation && (
                        <p className="text-xs text-[var(--text-secondary)]">{answer.explanation}</p>
                    )}
                    <div className="pt-2">
                        <Button onClick={next} disabled={busy} className="bg-[var(--primary)] text-white">
                            {index < questions.length - 1 ? (
                                <>Câu tiếp <Icon name="arrow_forward" size="sm" /></>
                            ) : (
                                <>Xem kết quả <Icon name="done_all" size="sm" /></>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
