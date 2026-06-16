'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
    fetchHskExamAnswers,
    getMediaUrl,
    type HskExamAnswersResponse,
    type HskAnswerQuestion,
    type HskOption,
} from '@/lib/api';
import { HskTestProvider, useHskTest } from '@/components/hsk-test/HskTestContext';
import { GroupHeader } from '@/components/hsk-test/GroupHeader';
import { PinyinRuby } from '@/components/hsk-test/PinyinRuby';
import { AudioPlayer } from '@/components/hsk-test/AudioPlayer';
import { SafeRender } from '@/components/SafeRender';
import { ExamReviewShell, type ReviewSection } from '@/components/hsk-test/ExamReviewShell';

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
    sectionAudioUrl?: string;
    sectionInstructions?: string;
}

/**
 * Single-question answer card. Same structure as before but now rendered
 * one-at-a-time inside ExamReviewShell instead of stacked. Section-level
 * audio + instructions render inline at the top when present (caller can
 * still suppress by omitting the props).
 */
function AnswerCard({ question, questionNumber, sectionAudioUrl, sectionInstructions }: AnswerCardProps) {
    const [showTranscript, setShowTranscript] = useState(true);
    const { showPinyin } = useHskTest();
    const correct = question.correctAnswer;
    const meta = (question.meta || {}) as Record<string, unknown>;
    const pinyinMeta = (meta.pinyin || {}) as Record<string, string>;

    const options = getOptionsAsArray(question.options);

    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            {sectionAudioUrl && (
                <AudioPlayer src={sectionAudioUrl} label="Audio toàn section" />
            )}
            {sectionInstructions && (
                <p className="text-sm text-[var(--text-secondary)] italic">{sectionInstructions}</p>
            )}

            {/* Header: number + type */}
            <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[var(--text-secondary)]">Câu {questionNumber}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-muted)] italic">{question.questionType}</span>
                {question.points > 1 && (
                    <span className="ml-auto text-[var(--text-muted)]">{question.points} điểm</span>
                )}
            </div>

            {/* Audio câu này — chỉ khi có audio riêng từng câu (đề cũ). */}
            {question.questionAudio && (
                <AudioPlayer src={question.questionAudio} label="Audio câu này" />
            )}
            {/* Transcript phần nghe — render ĐỘC LẬP với audio. Đề v2 dùng 1 audio chung
                cả đề (không có audio riêng từng câu); nếu lồng trong khối questionAudio thì
                transcript sẽ KHÔNG bao giờ hiện ở các câu nghe v2. */}
            {question.transcript && (
                <div className="space-y-2">
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                        <Icon name={showTranscript ? 'expand_less' : 'expand_more'} size="xs" />
                        {showTranscript ? 'Ẩn' : 'Hiện'} transcript
                    </button>
                    {showTranscript && (
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
                // eslint-disable-next-line @next/next/no-img-element
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
                                            // eslint-disable-next-line @next/next/no-img-element
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

function ExamAnswersInner() {
    const params = useParams();
    const router = useRouter();
    const examId = Number(params.examId);

    const [exam, setExam] = useState<HskExamAnswersResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // Adapt to the shell's generic ReviewSection<Q> shape.
    const sections: ReviewSection<HskAnswerQuestion>[] = exam.sections.map(s => ({
        id: s.id,
        section_type: s.section_type,
        section_order: s.section_order,
        title: s.title,
        instructions: s.instructions,
        audio_url: s.audio_url,
        groups: s.groups,
        questions: s.questions,
    }));

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <ExamReviewShell<HskAnswerQuestion>
                title={exam.title}
                hskLevel={exam.hsk_level}
                subtitle="Đáp án & Transcript"
                breadcrumb={[
                    { href: '/', label: 'Trang chủ' },
                    { href: '/hsk-test', label: 'Luyện thi HSK' },
                    { label: exam.title },
                    { label: 'Đáp án' },
                ]}
                sections={sections}
                renderQuestion={(q, info) => {
                    // Show group header on the FIRST question of each group
                    // (matches in-exam behavior so the user immediately gets
                    // the cluster context when jumping via the map).
                    const showGroup = !!q.groupId
                        && info.section.groups
                        && info.section.groups.some(g => g.id === q.groupId)
                        && info.section.questions.find(qq => qq.groupId === q.groupId)?.id === q.id;
                    const group = showGroup ? info.section.groups!.find(g => g.id === q.groupId) : null;
                    // Section-level audio + instructions render once at the
                    // top of the FIRST question of the section.
                    const isSectionFirst = info.section.questions[0]?.id === q.id;
                    return (
                        <SafeRender
                            fallback={
                                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                                    Câu {info.questionNumber} bị thiếu dữ liệu — bỏ qua.
                                </div>
                            }
                        >
                            <div className="space-y-3">
                                {group && <GroupHeader group={group} />}
                                <AnswerCard
                                    question={q}
                                    questionNumber={info.questionNumber}
                                    sectionAudioUrl={isSectionFirst ? info.section.audio_url : undefined}
                                    sectionInstructions={isSectionFirst ? info.section.instructions : undefined}
                                />
                            </div>
                        </SafeRender>
                    );
                }}
            />

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
