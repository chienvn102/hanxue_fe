'use client';

import type { QuestionFormData } from './hsk-types';
import { SECTION_COLORS } from './hsk-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface QuestionPreviewProps {
    form: QuestionFormData;
    sectionType: string;
}

export function QuestionPreview({ form, sectionType }: QuestionPreviewProps) {
    const sColor = SECTION_COLORS[sectionType] || SECTION_COLORS.reading;
    const type = form.question_type;

    const resolveUrl = (url: string) =>
        url && url.startsWith('/') ? `${API_BASE}${url}` : url;

    return (
        <div className="sticky top-4">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2 text-center">
                Xem trước
            </h4>

            {/* Phone frame */}
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-[24px] p-1.5 bg-gray-100 dark:bg-gray-800 max-w-[280px] mx-auto shadow-lg">
                {/* Notch */}
                <div className="w-16 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-1" />

                {/* Screen */}
                <div className="bg-[var(--background)] rounded-[18px] p-3 min-h-[420px] flex flex-col text-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
                        <span className="text-xs font-semibold text-[var(--text-main)]">HSK Test</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">⏱ 01:23:47</span>
                    </div>

                    {/* Question info */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                            Câu {form.question_number || 1}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${sColor.bg} ${sColor.text}`}>
                            {sColor.label}
                        </span>
                        {form.points > 1 && (
                            <span className="text-[10px] text-amber-500 font-mono ml-auto">
                                {form.points}đ
                            </span>
                        )}
                    </div>

                    {/* Audio indicator */}
                    {form.question_audio && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-xs">🎵</span>
                            <div className="flex-1 h-1 bg-blue-200 dark:bg-blue-700 rounded-full">
                                <div className="w-1/3 h-full bg-blue-500 rounded-full" />
                            </div>
                            <span className="text-[10px] text-blue-500">{form.audio_play_count}x</span>
                        </div>
                    )}

                    {/* Question image */}
                    {form.question_image && type !== 'image_match' && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-[var(--border)]">
                            <img
                                src={resolveUrl(form.question_image)}
                                alt="question"
                                className="w-full h-24 object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    )}

                    {/* Question text */}
                    <p className="text-sm text-[var(--text-main)] mb-3 leading-relaxed">
                        {form.question_text || (
                            <span className="text-[var(--text-muted)] italic">Nội dung câu hỏi...</span>
                        )}
                    </p>

                    {/* ── MCQ preview ── */}
                    {(type === 'multiple_choice' || type === 'error_identify') && (
                        <div className="space-y-1.5 flex-1">
                            {['A', 'B', 'C', 'D'].map((opt, idx) => (
                                <div
                                    key={opt}
                                    className={`p-2 rounded-lg border text-xs transition-colors ${
                                        form.correct_answer === opt
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                            : 'border-[var(--border)]'
                                    }`}
                                >
                                    <span className="font-bold mr-1.5">{opt}.</span>
                                    {form.options[idx] || '...'}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── True/False preview ── */}
                    {type === 'true_false' && (
                        <div className="grid grid-cols-2 gap-2 flex-1">
                            {['Đúng', 'Sai'].map(val => (
                                <div
                                    key={val}
                                    className={`p-3 rounded-xl border-2 text-center text-xs font-semibold ${
                                        form.correct_answer === val
                                            ? val === 'Đúng'
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                                                : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                                            : 'border-[var(--border)] text-[var(--text-secondary)]'
                                    }`}
                                >
                                    <span className="text-lg block mb-0.5">{val === 'Đúng' ? '✅' : '❌'}</span>
                                    {val}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Image match preview ── */}
                    {type === 'image_match' && (
                        <div className="grid grid-cols-2 gap-1.5 flex-1">
                            {['A', 'B', 'C', 'D'].map((opt, idx) => (
                                <div
                                    key={opt}
                                    className={`rounded-lg border overflow-hidden ${
                                        form.correct_answer === opt
                                            ? 'border-green-500 ring-1 ring-green-500'
                                            : 'border-[var(--border)]'
                                    }`}
                                >
                                    {form.option_images[idx] ? (
                                        <img
                                            src={resolveUrl(form.option_images[idx])}
                                            alt={opt}
                                            className="w-full h-16 object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-full h-16 bg-[var(--surface-secondary)] flex items-center justify-center text-[10px] text-[var(--text-muted)]">
                                            {opt}
                                        </div>
                                    )}
                                    <div className="text-[10px] p-1 text-center truncate text-[var(--text-muted)]">
                                        {form.options[idx] || opt}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Fill blank preview ── */}
                    {type === 'fill_blank' && (
                        <div className="flex-1">
                            <div className="p-2 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--text-main)]">
                                {form.question_text
                                    ? form.question_text.replace(/＿＿|___/g, ' [ ＿＿ ] ')
                                    : '我 [ ＿＿ ] 学生。'}
                            </div>
                            {form.correct_answer && (
                                <p className="text-[10px] text-green-600 mt-2">
                                    ✓ {form.correct_answer}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Sentence order preview — MCQ-style ── */}
                    {type === 'sentence_order' && (
                        <div className="space-y-1.5 flex-1">
                            {['A', 'B', 'C', 'D'].map((opt, idx) => (
                                <div
                                    key={opt}
                                    className={`p-2 rounded-lg border text-xs transition-colors ${
                                        form.correct_answer === opt
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                            : 'border-[var(--border)]'
                                    }`}
                                >
                                    <span className="font-bold mr-1.5">{opt}.</span>
                                    {form.options[idx] || '...'}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Short answer preview ── */}
                    {type === 'short_answer' && (
                        <div className="flex-1">
                            <div className="border border-dashed border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-muted)] min-h-[60px]">
                                Nhập câu trả lời...
                            </div>
                            {form.correct_answer && (
                                <p className="text-[10px] text-green-600 mt-2">
                                    Mẫu: {form.correct_answer}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Submit button mock */}
                    <div className="mt-auto pt-3">
                        <div className="w-full py-2 bg-[var(--primary)]/20 text-[var(--primary)] text-xs text-center rounded-lg font-medium">
                            Tiếp tục →
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
