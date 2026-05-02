'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import {
    fetchHskExamAnswers,
    getMediaUrl,
    type HskExamAnswersResponse,
    type HskAnswerSection,
    type HskAnswerQuestion,
    type HskQuestionGroup,
    type HskOption,
} from '@/lib/api';
import { HskTestProvider, useHskTest } from '@/components/hsk-test/HskTestContext';
import { GroupHeader } from '@/components/hsk-test/GroupHeader';
import { PinyinRuby } from '@/components/hsk-test/PinyinRuby';
import { AudioPlayer } from '@/components/hsk-test/AudioPlayer';

const SECTION_LABEL: Record<string, string> = {
    listening: 'Nghe (听力)',
    reading: 'Đọc (阅读)',
    writing: 'Viết (书写)',
};

const HSK_COLORS: Record<number, string> = {
    1: 'bg-green-500',
    2: 'bg-teal-500',
    3: 'bg-blue-500',
    4: 'bg-purple-500',
    5: 'bg-orange-500',
    6: 'bg-red-500',
};

function PinyinToggle() {
    const { showPinyin, setShowPinyin } = useHskTest();
    return (
        <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                showPinyin
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
            }`}
            title="Hiện / ẩn pinyin"
        >
            {showPinyin ? '🅿 Pinyin' : '🅿 Pinyin'}
        </button>
    );
}

function isHskOption(opt: unknown): opt is HskOption {
    return typeof opt === 'object' && opt !== null && 'label' in opt && 'text' in opt;
}

function getOptionsAsArray(options: HskAnswerQuestion['options']): HskOption[] {
    if (!options || !Array.isArray(options)) return [];
    return options.map((o, i) => {
        const label = String.fromCharCode(65 + i);
        if (isHskOption(o)) return o;
        if (typeof o === 'string') return { label, text: o };
        return { label, text: String(o) };
    });
}

interface AnswerCardProps {
    question: HskAnswerQuestion;
    questionNumber: number;
}

function AnswerCard({ question, questionNumber }: AnswerCardProps) {
    const [showTranscript, setShowTranscript] = useState(false);
    const { showPinyin } = useHskTest();
    const correct = question.correctAnswer;
    const meta = (question.meta || {}) as Record<string, unknown>;
    const pinyinMeta = (meta.pinyin || {}) as Record<string, string>;

    const options = getOptionsAsArray(question.options);

    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            {/* Header: number + type */}
            <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[var(--text-secondary)]">Câu {questionNumber}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-muted)] italic">{question.questionType}</span>
                {question.points > 1 && (
                    <span className="ml-auto text-[var(--text-muted)]">{question.points} điểm</span>
                )}
            </div>

            {/* Audio + transcript toggle */}
            {question.questionAudio && (
                <div className="space-y-2">
                    <AudioPlayer src={question.questionAudio} label="Audio câu này" />
                    {question.transcript && (
                        <button
                            onClick={() => setShowTranscript(!showTranscript)}
                            className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                        >
                            <Icon name={showTranscript ? 'chevron-up' : 'chevron-down'} size="xs" />
                            {showTranscript ? 'Ẩn' : 'Hiện'} transcript
                        </button>
                    )}
                    {showTranscript && question.transcript && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 text-sm hanzi whitespace-pre-wrap border border-amber-200 dark:border-amber-800/30">
                            {question.transcript}
                        </div>
                    )}
                </div>
            )}

            {/* Passage */}
            {question.passage && (
                <div className="bg-[var(--surface-secondary)] rounded-lg p-3 text-sm hanzi border-l-4 border-[var(--primary)]">
                    <PinyinRuby
                        zh={question.passage}
                        pinyin={typeof pinyinMeta.passage === 'string' ? pinyinMeta.passage : undefined}
                        show={showPinyin}
                    />
                </div>
            )}

            {/* Question image */}
            {question.questionImage && (
                <img
                    src={getMediaUrl(question.questionImage)}
                    alt=""
                    className="max-w-full md:max-w-sm rounded-lg bg-white"
                />
            )}

            {/* Statement */}
            {question.statement && (
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 text-base hanzi">
                    <span className="text-xs text-blue-600 dark:text-blue-400 mr-2">★</span>
                    <PinyinRuby
                        zh={question.statement}
                        pinyin={typeof pinyinMeta.statement === 'string' ? pinyinMeta.statement : undefined}
                        show={showPinyin}
                    />
                </div>
            )}

            {/* Question text */}
            {question.questionText && (
                <div className="text-base hanzi">
                    <PinyinRuby
                        zh={question.questionText}
                        pinyin={typeof pinyinMeta.question_text === 'string' ? pinyinMeta.question_text : undefined}
                        show={showPinyin}
                    />
                </div>
            )}

            {/* fill_hanzi context */}
            {question.questionType === 'fill_hanzi' && typeof meta.context_zh_with_blank === 'string' && (
                <div className="bg-[var(--surface-secondary)] rounded-lg p-3 text-base hanzi">
                    <span className="text-xs text-[var(--text-muted)] mr-2">Câu:</span>
                    {meta.context_zh_with_blank}
                    {typeof meta.pinyin_hint === 'string' && (
                        <span className="ml-3 text-sm italic text-[var(--text-muted)]">
                            ({meta.pinyin_hint})
                        </span>
                    )}
                </div>
            )}

            {/* sentence_assembly chunks */}
            {question.questionType === 'sentence_assembly' && Array.isArray(meta.chunks) && (
                <div className="flex flex-wrap gap-2">
                    {(meta.chunks as { text: string }[]).map((c, i) => (
                        <span
                            key={i}
                            className="px-3 py-1 bg-[var(--surface-secondary)] rounded text-sm hanzi border border-[var(--border)]"
                        >
                            {c.text}
                        </span>
                    ))}
                </div>
            )}

            {/* Options for MCQ-like */}
            {options.length > 0 &&
                ['multiple_choice', 'image_match', 'sentence_order', 'error_identify'].includes(
                    question.questionType
                ) && (
                    <div className="space-y-2">
                        {options.map((opt, idx) => {
                            const isCorrect = opt.label === correct;
                            return (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                        isCorrect
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                            : 'border-[var(--border)]'
                                    }`}
                                >
                                    <span
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                            isCorrect
                                                ? 'bg-green-500 text-white'
                                                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                                        }`}
                                    >
                                        {opt.label}
                                    </span>
                                    <div className="flex-1">
                                        {question.optionImages?.[idx] && (
                                            <img
                                                src={getMediaUrl(question.optionImages[idx])}
                                                alt=""
                                                className="max-w-[200px] rounded mb-2"
                                            />
                                        )}
                                        <div className="hanzi text-sm">
                                            <PinyinRuby
                                                zh={opt.text}
                                                pinyin={opt.pinyin}
                                                show={showPinyin}
                                            />
                                        </div>
                                    </div>
                                    {isCorrect && (
                                        <span className="text-green-600 text-xs font-semibold shrink-0">
                                            ✓ Đáp án đúng
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

            {/* Letter answer for group-based + true_false + fill */}
            {['true_false', 'image_grid_match', 'word_bank_fill', 'reply_match', 'fill_blank', 'fill_hanzi', 'sentence_assembly', 'short_answer'].includes(
                question.questionType
            ) && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-500 rounded-lg p-3">
                    <span className="text-xs text-green-700 dark:text-green-400 font-semibold mr-2">
                        ✓ Đáp án đúng:
                    </span>
                    <span className="hanzi font-semibold">{correct}</span>
                </div>
            )}

            {/* Explanation */}
            {question.explanation && (
                <div className="bg-[var(--surface-secondary)] rounded-lg p-3 text-sm">
                    <span className="text-xs text-[var(--text-muted)] font-semibold block mb-1">
                        💡 Giải thích
                    </span>
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{question.explanation}</p>
                </div>
            )}
        </div>
    );
}

interface SectionViewProps {
    section: HskAnswerSection;
}

function SectionView({ section }: SectionViewProps) {
    const groupMap = new Map<number, HskQuestionGroup>();
    for (const g of section.groups || []) groupMap.set(g.id, g);

    const renderedGroupIds = new Set<number>();

    return (
        <div className="space-y-4">
            {section.title && (
                <h2 className="text-lg font-semibold text-[var(--text)]">{section.title}</h2>
            )}
            {section.instructions && (
                <p className="text-sm text-[var(--text-secondary)] italic">{section.instructions}</p>
            )}
            {section.audio_url && (
                <AudioPlayer src={section.audio_url} label="Audio toàn section" />
            )}

            {section.questions.map((q, idx) => {
                const showGroup =
                    q.groupId && !renderedGroupIds.has(q.groupId) && groupMap.has(q.groupId);
                if (q.groupId && showGroup) renderedGroupIds.add(q.groupId);
                return (
                    <div key={q.id}>
                        {showGroup && q.groupId && groupMap.has(q.groupId) && (
                            <GroupHeader group={groupMap.get(q.groupId)!} />
                        )}
                        <AnswerCard question={q} questionNumber={idx + 1} />
                    </div>
                );
            })}
        </div>
    );
}

function ExamAnswersInner() {
    const params = useParams();
    const router = useRouter();
    const examId = Number(params.examId);

    const [exam, setExam] = useState<HskExamAnswersResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState(0);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const data = await fetchHskExamAnswers(examId);
                setExam(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [examId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-[var(--text-muted)]">Đang tải đáp án...</div>
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3">
                <p className="text-red-500">{error || 'Không tìm thấy đề thi'}</p>
                <button
                    onClick={() => router.push('/hsk-test')}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm"
                >
                    ← Về trang đề thi
                </button>
            </div>
        );
    }

    const section = exam.sections[activeSection];

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => router.push('/hsk-test')}
                        className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                        title="Về danh sách đề"
                    >
                        <Icon name="arrow-left" size="md" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span
                                className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${
                                    HSK_COLORS[exam.hsk_level] || 'bg-gray-500'
                                }`}
                            >
                                HSK {exam.hsk_level}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">Đáp án &amp; Transcript</span>
                        </div>
                        <h1 className="text-base font-semibold text-[var(--text)] truncate">{exam.title}</h1>
                    </div>
                    <PinyinToggle />
                </div>
            </header>

            {/* Section tabs */}
            <div className="max-w-4xl mx-auto px-4 pt-4">
                <div className="flex flex-wrap gap-2 border-b border-[var(--border)]">
                    {exam.sections.map((s, idx) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(idx)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                activeSection === idx
                                    ? 'border-[var(--primary)] text-[var(--primary)]'
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            {SECTION_LABEL[s.section_type] || s.section_type}{' '}
                            <span className="text-xs text-[var(--text-muted)]">
                                ({s.questions.length})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Section content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {section ? <SectionView section={section} /> : null}
            </main>
        </div>
    );
}

export default function ExamAnswersPage() {
    return (
        <HskTestProvider>
            <ExamAnswersInner />
        </HskTestProvider>
    );
}
