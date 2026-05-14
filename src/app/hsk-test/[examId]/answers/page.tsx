'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { HSKBadge } from '@/components/ui/Badge';
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
import { SafeRender } from '@/components/SafeRender';

const SECTION_LABEL: Record<string, string> = {
    listening: 'Nghe (听力)',
    reading: 'Đọc (阅读)',
    writing: 'Viết (书写)',
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
                            <Icon name={showTranscript ? 'expand_less' : 'expand_more'} size="xs" />
                            {showTranscript ? 'Ẩn' : 'Hiện'} transcript
                        </button>
                    )}
                    {showTranscript && question.transcript && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm hanzi whitespace-pre-wrap">
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
                    className="max-w-full md:max-w-sm rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                />
            )}

            {/* Statement */}
            {question.statement && (
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3 text-base hanzi">
                    <span className="text-xs text-sky-500 mr-2">★</span>
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
                            const optionImage = Array.isArray(question.optionImages)
                                && question.optionImages.length > idx
                                ? question.optionImages[idx]
                                : null;
                            return (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                        isCorrect
                                            ? 'border-emerald-500/60 bg-emerald-500/10'
                                            : 'border-[var(--border)]'
                                    }`}
                                >
                                    <span
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                            isCorrect
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                                        }`}
                                    >
                                        {opt.label || String.fromCharCode(65 + idx)}
                                    </span>
                                    <div className="flex-1">
                                        {optionImage && (
                                            <img
                                                src={getMediaUrl(optionImage)}
                                                alt=""
                                                className="max-w-[200px] rounded mb-2"
                                            />
                                        )}
                                        <div className="hanzi text-sm">
                                            <PinyinRuby
                                                zh={opt.text || ''}
                                                pinyin={opt.pinyin}
                                                show={showPinyin}
                                            />
                                        </div>
                                    </div>
                                    {isCorrect && (
                                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0">
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
                <div className="bg-emerald-500/10 border border-emerald-500/60 rounded-lg p-3">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mr-2">
                        ✓ Đáp án đúng:
                    </span>
                    <span className="hanzi font-semibold">{correct || '(chưa có đáp án)'}</span>
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
                <h2 className="text-lg font-semibold text-[var(--text-main)]">{section.title}</h2>
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
                    <SafeRender
                        key={q.id}
                        fallback={
                            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                                Câu {idx + 1} bị thiếu dữ liệu — bỏ qua.
                            </div>
                        }
                    >
                        <div>
                            {showGroup && q.groupId && groupMap.has(q.groupId) && (
                                <GroupHeader group={groupMap.get(q.groupId)!} />
                            )}
                            <AnswerCard question={q} questionNumber={idx + 1} />
                        </div>
                    </SafeRender>
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
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex items-center justify-center" role="status" aria-busy="true">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                    <span className="sr-only">Đang tải đáp án...</span>
                </div>
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                    <Icon name="error" size="xl" className="text-red-500 mb-2" />
                    <p className="text-[var(--text-secondary)]">{error || 'Không tìm thấy đề thi'}</p>
                    <button
                        onClick={() => router.push('/hsk-test')}
                        className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-hover)] transition-colors"
                    >
                        ← Về trang đề thi
                    </button>
                </div>
                <Footer />
            </div>
        );
    }

    const section = exam.sections[activeSection];

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            {/* Sticky sub-header: meta + section tabs + pinyin toggle.
                Pinned under global Header (h-16 sm:h-20) so user can switch
                section / toggle pinyin without scrolling back to top. */}
            <div className="sticky top-16 sm:top-20 z-30 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)]">
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                            <HSKBadge level={exam.hsk_level} />
                            <h1 className="text-sm sm:text-base font-semibold text-[var(--text-main)] truncate">
                                {exam.title}
                            </h1>
                            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">· Đáp án &amp; Transcript</span>
                        </div>
                        <PinyinToggle />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 -mb-px">
                        {exam.sections.map((s, idx) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(idx)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
            </div>

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Breadcrumb (normal flow — only relevant once at top) */}
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                    <Link href="/" className="hover:text-[var(--primary)] transition-colors">Trang chủ</Link>
                    <Icon name="chevron_right" size="xs" />
                    <Link href="/hsk-test" className="hover:text-[var(--primary)] transition-colors">Luyện thi HSK</Link>
                    <Icon name="chevron_right" size="xs" />
                    <span className="text-[var(--text-main)] line-clamp-1">{exam.title}</span>
                    <Icon name="chevron_right" size="xs" />
                    <span className="text-[var(--text-muted)]">Đáp án</span>
                </nav>

                {/* Section content */}
                {section ? <SectionView section={section} /> : null}
            </main>

            <Footer />
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
