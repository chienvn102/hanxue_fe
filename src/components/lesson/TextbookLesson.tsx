'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import {
    fetchTextbookLesson, markLessonSectionDone, submitWritingExercise, playAudio,
    type TextbookLessonPayload, type TextbookVocab, type TextbookGrammar,
    type TextbookWritingExercise, type LessonSection,
} from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

interface Props {
    lessonId: number | string;
}

type TabId = 'vocab' | 'passage' | 'grammar' | 'writing';

export default function TextbookLesson({ lessonId }: Props) {
    const [payload, setPayload] = useState<TextbookLessonPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('vocab');
    const passageAudioRef = useRef<HTMLAudioElement | null>(null);

    const reload = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchTextbookLesson(lessonId);
            setPayload(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tải bài học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lessonId]);

    const markDone = async (section: LessonSection) => {
        try {
            const result = await markLessonSectionDone(lessonId, section);
            // Re-fetch progress payload (simpler than patching state)
            await reload();
            if (result.justCompleted) {
                // optional: toast
                console.log('Lesson completed!');
            }
        } catch (err) {
            console.error('mark section', err);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
            </div>
        );
    }
    if (error || !payload) {
        return (
            <div className="p-6 rounded-xl bg-[var(--error)]/10 text-[var(--error)] text-sm">
                {error || 'Không tải được bài học'}
            </div>
        );
    }

    const { lesson, vocabulary, grammar, writingExercises, hskExams, progress } = payload;
    const tabs: { id: TabId; label: string; icon: string; count?: number; done?: boolean }[] = [
        { id: 'vocab',   label: 'Từ vựng',   icon: 'translate',     count: vocabulary.length,       done: progress?.vocab_done },
        { id: 'passage', label: 'Bài khóa',  icon: 'menu_book',                                       done: progress?.passage_done },
        { id: 'grammar', label: 'Ngữ pháp',  icon: 'auto_stories',  count: grammar.length,           done: progress?.grammar_done },
        { id: 'writing', label: 'Bài tập',   icon: 'edit_note',     count: writingExercises.length,  done: progress?.exercise_done },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">{lesson.title}</h1>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        HSK {lesson.hsk_level}
                    </span>
                    {progress?.status === 'completed' && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 inline-flex items-center gap-1">
                            <Icon name="check_circle" size="xs" /> Đã xong
                        </span>
                    )}
                </div>
                {lesson.objectives_vi && (
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        <span className="font-semibold text-[var(--text-main)]">Mục tiêu: </span>
                        {lesson.objectives_vi}
                    </p>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-[var(--border)]">
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-[var(--primary)] text-[var(--primary)]'
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                        >
                            <Icon name={tab.icon} size="sm" />
                            {tab.label}
                            {typeof tab.count === 'number' && tab.count > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--surface-secondary)] rounded-full">
                                    {tab.count}
                                </span>
                            )}
                            {tab.done && <Icon name="check_circle" size="xs" className="text-emerald-500" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            {activeTab === 'vocab' && (
                <VocabSection
                    items={vocabulary}
                    done={!!progress?.vocab_done}
                    onMarkDone={() => markDone('vocab')}
                />
            )}
            {activeTab === 'passage' && (
                <PassageSection
                    lesson={lesson}
                    audioRef={passageAudioRef}
                    done={!!progress?.passage_done}
                    onMarkDone={() => markDone('passage')}
                />
            )}
            {activeTab === 'grammar' && (
                <GrammarSection
                    items={grammar}
                    done={!!progress?.grammar_done}
                    onMarkDone={() => markDone('grammar')}
                />
            )}
            {activeTab === 'writing' && (
                <WritingSection
                    exercises={writingExercises}
                    hskExams={hskExams}
                    done={!!progress?.exercise_done}
                    onMarkDone={() => markDone('exercise')}
                />
            )}
        </div>
    );
}

// ----------------------------- Vocab section ------------------------------

function VocabSection({ items, done, onMarkDone }: { items: TextbookVocab[]; done: boolean; onMarkDone: () => void }) {
    if (items.length === 0) {
        return <EmptyState icon="translate" text="Chưa có từ vựng cho bài này" />;
    }
    return (
        <div className="space-y-3">
            {items.map(v => (
                <div key={v.link_id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all">
                    <div className="flex items-start gap-3">
                        <button
                            onClick={() => playAudio(v.simplified)}
                            className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors shrink-0"
                            title="Nghe phát âm"
                        >
                            <Icon name="volume_up" size="sm" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <Link href={`/vocab/${v.id}`} className="text-2xl font-medium text-[var(--text-main)] hover:text-[var(--primary)] transition-colors hanzi">
                                    {v.simplified}
                                </Link>
                                <span className="text-sm text-[var(--text-secondary)]">{v.pinyin}</span>
                                {v.word_type && (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                        {v.word_type}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-[var(--text-main)] mt-1">{v.meaning_vi}</p>
                            {v.note_vi && (
                                <p className="text-xs text-[var(--text-muted)] mt-1 italic">Lưu ý: {v.note_vi}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <SectionFooter done={done} onMarkDone={onMarkDone} doneLabel="Đã thuộc từ vựng" />
        </div>
    );
}

// ---------------------------- Passage section -----------------------------

function PassageSection({
    lesson, audioRef, done, onMarkDone,
}: {
    lesson: TextbookLessonPayload['lesson'];
    audioRef: React.MutableRefObject<HTMLAudioElement | null>;
    done: boolean;
    onMarkDone: () => void;
}) {
    const [showPinyin, setShowPinyin] = useState(true);
    const [showVi, setShowVi] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioUrl = lesson.passage_audio_url
        ? (lesson.passage_audio_url.startsWith('http') ? lesson.passage_audio_url : `${API_BASE_URL}${lesson.passage_audio_url}`)
        : null;

    const togglePlay = () => {
        if (!audioUrl) return;
        if (!audioRef.current) {
            const audio = new Audio(audioUrl);
            audio.onended = () => setIsPlaying(false);
            audio.onerror = () => setIsPlaying(false);
            audioRef.current = audio;
        }
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    };

    if (!lesson.passage_zh) {
        return <EmptyState icon="menu_book" text="Bài khóa chưa được cập nhật" />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Button
                    onClick={togglePlay}
                    disabled={!audioUrl}
                    className="bg-[var(--primary)] text-white"
                >
                    <Icon name={isPlaying ? 'pause' : 'play_arrow'} size="sm" />
                    {audioUrl ? (isPlaying ? 'Tạm dừng' : 'Nghe bài khóa') : 'Audio chưa có'}
                </Button>
                <button
                    onClick={() => setShowPinyin(v => !v)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        showPinyin
                            ? 'border-[var(--primary)]/40 text-[var(--primary)] bg-[var(--primary)]/5'
                            : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}
                >
                    Pinyin
                </button>
                <button
                    onClick={() => setShowVi(v => !v)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        showVi
                            ? 'border-[var(--primary)]/40 text-[var(--primary)] bg-[var(--primary)]/5'
                            : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}
                >
                    Tiếng Việt
                </button>
            </div>

            <article className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
                <p className="text-2xl leading-relaxed text-[var(--text-main)] hanzi whitespace-pre-wrap">
                    {lesson.passage_zh}
                </p>
                {showPinyin && lesson.passage_pinyin && (
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap italic">
                        {lesson.passage_pinyin}
                    </p>
                )}
                {showVi && lesson.passage_vi && (
                    <p className="text-base leading-relaxed text-[var(--text-main)] whitespace-pre-wrap pt-3 border-t border-[var(--border)]">
                        {lesson.passage_vi}
                    </p>
                )}
            </article>

            <SectionFooter done={done} onMarkDone={onMarkDone} doneLabel="Đã đọc bài khóa" />
        </div>
    );
}

// ---------------------------- Grammar section -----------------------------

function GrammarSection({ items, done, onMarkDone }: { items: TextbookGrammar[]; done: boolean; onMarkDone: () => void }) {
    if (items.length === 0) {
        return <EmptyState icon="auto_stories" text="Bài này không có điểm ngữ pháp" />;
    }
    return (
        <div className="space-y-4">
            {items.map(g => (
                <div key={g.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-[var(--text-main)]">{g.grammar_point}</h3>
                        {g.pattern_formula && (
                            <code className="px-2 py-0.5 text-xs rounded bg-[var(--surface-secondary)] text-[var(--primary)] font-mono">
                                {g.pattern_formula}
                            </code>
                        )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">{g.explanation}</p>
                    {g.examples && g.examples.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                            {g.examples.map((ex, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <button
                                        onClick={() => playAudio(ex.chinese)}
                                        className="mt-0.5 w-7 h-7 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors shrink-0"
                                    >
                                        <Icon name="volume_up" size="xs" />
                                    </button>
                                    <div className="flex-1">
                                        <p className="text-sm text-[var(--text-main)] hanzi">{ex.chinese}</p>
                                        {ex.pinyin && <p className="text-xs text-[var(--text-muted)] italic">{ex.pinyin}</p>}
                                        <p className="text-xs text-[var(--text-secondary)]">{ex.vietnamese}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            <SectionFooter done={done} onMarkDone={onMarkDone} doneLabel="Đã hiểu ngữ pháp" />
        </div>
    );
}

// ---------------------------- Writing section -----------------------------

function WritingSection({
    exercises, hskExams, done, onMarkDone,
}: {
    exercises: TextbookWritingExercise[];
    hskExams: TextbookLessonPayload['hskExams'];
    done: boolean;
    onMarkDone: () => void;
}) {
    return (
        <div className="space-y-4">
            {exercises.length === 0 && hskExams.length === 0 && (
                <EmptyState icon="edit_note" text="Bài này chưa có bài tập" />
            )}

            {exercises.map(ex => (
                <WritingCard key={ex.id} exercise={ex} />
            ))}

            {hskExams.length > 0 && (
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <h3 className="font-semibold text-[var(--text-main)] mb-3">Bài kiểm tra HSK liên kết</h3>
                    <div className="space-y-2">
                        {hskExams.map(e => (
                            <Link
                                key={e.exam_id}
                                href={`/hsk-test/${e.exam_id}`}
                                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--primary)]/10 transition-colors"
                            >
                                <div>
                                    <div className="text-sm font-medium text-[var(--text-main)]">{e.title}</div>
                                    <div className="text-xs text-[var(--text-muted)]">HSK {e.hsk_level}</div>
                                </div>
                                <Icon name="chevron_right" size="sm" className="text-[var(--text-muted)]" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {(exercises.length > 0 || hskExams.length > 0) && (
                <SectionFooter done={done} onMarkDone={onMarkDone} doneLabel="Đã làm bài tập" />
            )}
        </div>
    );
}

function WritingCard({ exercise }: { exercise: TextbookWritingExercise }) {
    const [answer, setAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<Awaited<ReturnType<typeof submitWritingExercise>> | null>(null);
    const [showSample, setShowSample] = useState(false);

    const charCount = useMemo(() => (answer.match(/[一-鿿]/g) || []).length, [answer]);

    const onSubmit = async () => {
        if (!answer.trim() || submitting) return;
        try {
            setSubmitting(true);
            const r = await submitWritingExercise(exercise.id, answer);
            setResult(r);
        } catch (err) {
            console.error('submit writing', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="font-medium text-[var(--text-main)] mb-2">{exercise.prompt_vi}</p>
            {exercise.prompt_zh && (
                <p className="text-sm text-[var(--text-secondary)] hanzi mb-3">{exercise.prompt_zh}</p>
            )}

            <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Nhập câu trả lời tiếng Trung..."
                rows={4}
                disabled={!!result}
                className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-main)] hanzi text-base focus:border-[var(--primary)]/50 outline-none disabled:opacity-70"
            />
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>{charCount} / {exercise.max_chars} ký tự (tối thiểu {exercise.min_chars})</span>
                {exercise.expected_keywords && exercise.expected_keywords.length > 0 && (
                    <span>Cần dùng: {exercise.expected_keywords.join(', ')}</span>
                )}
            </div>

            {!result && (
                <Button onClick={onSubmit} disabled={!answer.trim() || submitting} className="mt-3">
                    <Icon name={submitting ? 'hourglass_top' : 'send'} size="sm" />
                    {submitting ? 'Đang chấm...' : 'Nộp bài'}
                </Button>
            )}

            {result && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--background)] space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${result.score >= 80 ? 'text-emerald-600' : result.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                            {result.score}/100
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                            {result.charCount} ký tự — {result.keywordHits.length} điểm trúng
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-main)]">{result.feedback}</p>
                    {result.keywordMissed.length > 0 && (
                        <p className="text-xs text-[var(--text-muted)]">
                            Còn thiếu: {result.keywordMissed.join(', ')}
                        </p>
                    )}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => { setResult(null); setAnswer(''); }}
                            className="text-xs text-[var(--primary)] hover:underline"
                        >
                            Làm lại
                        </button>
                        {exercise.sample_answer_zh && (
                            <button
                                onClick={() => setShowSample(s => !s)}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            >
                                {showSample ? 'Ẩn đáp án mẫu' : 'Xem đáp án mẫu'}
                            </button>
                        )}
                    </div>
                    {showSample && exercise.sample_answer_zh && (
                        <div className="mt-2 p-2 rounded border border-dashed border-[var(--border)] text-sm">
                            <p className="hanzi text-[var(--text-main)]">{exercise.sample_answer_zh}</p>
                            {exercise.sample_answer_pinyin && <p className="text-xs italic text-[var(--text-muted)]">{exercise.sample_answer_pinyin}</p>}
                            {exercise.sample_answer_vi && <p className="text-xs text-[var(--text-secondary)]">{exercise.sample_answer_vi}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------- Shared bits ---------------------------------

function EmptyState({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="text-center py-12 text-[var(--text-muted)]">
            <Icon name={icon} size="lg" className="mb-2" />
            <p>{text}</p>
        </div>
    );
}

function SectionFooter({ done, onMarkDone, doneLabel }: { done: boolean; onMarkDone: () => void; doneLabel: string }) {
    if (done) {
        return (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Icon name="check_circle" size="sm" /> {doneLabel}
            </div>
        );
    }
    return (
        <Button onClick={onMarkDone} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Icon name="check" size="sm" />
            Đánh dấu đã xong
        </Button>
    );
}
