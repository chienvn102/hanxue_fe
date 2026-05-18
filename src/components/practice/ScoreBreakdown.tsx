'use client';

import { Icon } from '@/components/ui/Icon';
import type {
    TranslateBreakdown,
    TranslateHighlight,
    TranslateGrammarIssue,
    TranslateVocabSuggestion,
} from '@/lib/api';

interface ScoreBreakdownProps {
    overallScore: number;
    feedbackVi: string;
    correctZh: string;
    correctPinyin?: string;
    breakdown?: TranslateBreakdown | null;
    highlights?: TranslateHighlight[];
    nextPracticeHintVi?: string;
}

const TRACK_LABELS = {
    meaningAccuracy: 'Ý nghĩa',
    grammar: 'Ngữ pháp',
    vocabulary: 'Từ vựng',
    fluency: 'Tự nhiên',
} as const;

function scoreTone(score: number): { color: string; bg: string; ring: string; label: string } {
    if (score >= 85) return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', ring: 'stroke-emerald-500', label: 'Xuất sắc' };
    if (score >= 70) return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', ring: 'stroke-blue-500', label: 'Tốt' };
    if (score >= 50) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', ring: 'stroke-amber-500', label: 'Khá' };
    return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', ring: 'stroke-red-500', label: 'Cần sửa' };
}

function ScoreRing({ score }: { score: number }) {
    const tone = scoreTone(score);
    const r = 44;
    const c = 2 * Math.PI * r;
    const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
    return (
        <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} className="fill-none stroke-[var(--surface-secondary)]" strokeWidth="8" />
                <circle
                    cx="50" cy="50" r={r}
                    className={`fill-none ${tone.ring} transition-[stroke-dashoffset] duration-700`}
                    strokeWidth="8"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${tone.color}`}>{score}</span>
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{tone.label}</span>
            </div>
        </div>
    );
}

function AxisBar({ label, score, comment }: { label: string; score: number; comment?: string }) {
    const tone = scoreTone(score);
    return (
        <div>
            <div className="flex items-baseline justify-between text-sm mb-1.5">
                <span className="font-medium text-[var(--text-main)]">{label}</span>
                <span className={`font-bold ${tone.color}`}>{score}<span className="text-[var(--text-muted)] font-normal text-xs">/100</span></span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                <div
                    className={`h-full ${tone.bg} transition-[width] duration-700`}
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
            </div>
            {comment && (
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">{comment}</p>
            )}
        </div>
    );
}

function GrammarIssueItem({ issue }: { issue: TranslateGrammarIssue }) {
    return (
        <div className="border-l-2 border-amber-500 pl-3 py-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                    {issue.type}
                </span>
                {issue.found && (
                    <code className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 line-through hanzi">
                        {issue.found}
                    </code>
                )}
                {issue.shouldBe && (
                    <>
                        <Icon name="arrow_forward" size="xs" className="text-[var(--text-muted)]" />
                        <code className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hanzi">
                            {issue.shouldBe}
                        </code>
                    </>
                )}
            </div>
            {issue.explanationVi && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{issue.explanationVi}</p>
            )}
        </div>
    );
}

function VocabSuggestionItem({ s }: { s: TranslateVocabSuggestion }) {
    return (
        <div className="border-l-2 border-blue-500 pl-3 py-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
                {s.yourWord && (
                    <code className="text-sm px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] hanzi">{s.yourWord}</code>
                )}
                <Icon name="arrow_forward" size="xs" className="text-[var(--text-muted)]" />
                {s.betterWord && (
                    <code className="text-sm px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium hanzi">
                        {s.betterWord}
                    </code>
                )}
            </div>
            {s.reasonVi && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.reasonVi}</p>
            )}
        </div>
    );
}

export function ScoreBreakdown({
    overallScore,
    feedbackVi,
    correctZh,
    correctPinyin,
    breakdown,
    highlights = [],
    nextPracticeHintVi,
}: ScoreBreakdownProps) {
    const hasBreakdown = !!breakdown;
    const grammarIssues = breakdown?.grammar.issues || [];
    const vocabSuggestions = breakdown?.vocabulary.suggestions || [];

    return (
        <div className="space-y-5">
            {/* Header: ring + summary */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                <ScoreRing score={overallScore} />
                <div className="flex-1 min-w-0 space-y-2">
                    {feedbackVi && (
                        <p className="text-base text-[var(--text-main)] leading-relaxed">{feedbackVi}</p>
                    )}
                    {highlights.length > 0 && (
                        <ul className="space-y-1">
                            {highlights.map((h, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <Icon
                                        name={h.type === 'good' ? 'check_circle' : 'error'}
                                        size="sm"
                                        className={h.type === 'good' ? 'text-emerald-500 mt-0.5' : 'text-amber-500 mt-0.5'}
                                    />
                                    <span className="text-[var(--text-secondary)]">{h.textVi}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* 4-axis bars */}
            {hasBreakdown && (
                <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--surface-secondary)]/40 border border-[var(--border)]">
                    <AxisBar label={TRACK_LABELS.meaningAccuracy} score={breakdown.meaningAccuracy.score} comment={breakdown.meaningAccuracy.commentVi} />
                    <AxisBar label={TRACK_LABELS.grammar} score={breakdown.grammar.score} comment={breakdown.grammar.commentVi} />
                    <AxisBar label={TRACK_LABELS.vocabulary} score={breakdown.vocabulary.score} comment={breakdown.vocabulary.commentVi} />
                    <AxisBar label={TRACK_LABELS.fluency} score={breakdown.fluency.score} comment={breakdown.fluency.commentVi} />
                </div>
            )}

            {/* Grammar issues */}
            {grammarIssues.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2 flex items-center gap-2">
                        <Icon name="rule" size="sm" className="text-amber-500" />
                        Lỗi ngữ pháp ({grammarIssues.length})
                    </h3>
                    <div className="space-y-2">
                        {grammarIssues.map((iss, i) => <GrammarIssueItem key={i} issue={iss} />)}
                    </div>
                </section>
            )}

            {/* Vocab suggestions */}
            {vocabSuggestions.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2 flex items-center gap-2">
                        <Icon name="auto_stories" size="sm" className="text-blue-500" />
                        Gợi ý từ vựng ({vocabSuggestions.length})
                    </h3>
                    <div className="space-y-2">
                        {vocabSuggestions.map((s, i) => <VocabSuggestionItem key={i} s={s} />)}
                    </div>
                </section>
            )}

            {/* Correct answer */}
            <section className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold mb-2 flex items-center gap-1.5">
                    <Icon name="task_alt" size="xs" />
                    Câu dịch mẫu
                </div>
                <p className="hanzi text-lg text-[var(--text-main)] mb-1">{correctZh}</p>
                {correctPinyin && (
                    <p className="pinyin text-sm text-[var(--text-secondary)]">{correctPinyin}</p>
                )}
            </section>

            {/* Next practice hint */}
            {nextPracticeHintVi && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                    <Icon name="tips_and_updates" size="sm" className="text-[var(--primary)] mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        <span className="font-semibold text-[var(--text-main)]">Gợi ý luyện tiếp: </span>
                        {nextPracticeHintVi}
                    </p>
                </div>
            )}
        </div>
    );
}
