'use client';

import type { QuestionFormData } from './hsk-types';
import { UploadField } from './UploadField';

interface QuestionFormByTypeProps {
    form: QuestionFormData;
    onChange: (form: QuestionFormData) => void;
    sectionType: string;
}

export function QuestionFormByType({ form, onChange, sectionType }: QuestionFormByTypeProps) {
    const isListening = sectionType === 'listening';
    const type = form.question_type;

    const set = <K extends keyof QuestionFormData>(key: K, value: QuestionFormData[K]) => {
        onChange({ ...form, [key]: value });
    };

    const updateOption = (idx: number, value: string) => {
        const next = [...form.options];
        next[idx] = value;
        onChange({ ...form, options: next });
    };

    const updateOptionImage = (idx: number, value: string) => {
        const next = [...form.option_images];
        next[idx] = value;
        onChange({ ...form, option_images: next });
    };

    return (
        <div className="space-y-4">
            {/* ── Question text ── */}
            <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">
                    Nội dung câu hỏi
                </label>
                <textarea
                    placeholder={
                        type === 'fill_blank'
                            ? 'Dùng ＿＿ để đánh dấu chỗ trống. VD: 我＿＿学生。'
                            : type === 'error_identify'
                            ? 'Nhập câu hỏi hoặc hướng dẫn (VD: "Chọn câu có lỗi")'
                            : 'Nhập nội dung câu hỏi...'
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={3}
                    value={form.question_text}
                    onChange={e => set('question_text', e.target.value)}
                />
            </div>

            {/* ── Audio config — listening or when audio is present ── */}
            {(isListening || form.question_audio) && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 space-y-3 border border-blue-200/50 dark:border-blue-800/30">
                    <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        🎧 Cấu hình Audio
                    </h4>
                    <UploadField
                        label="Audio câu hỏi"
                        value={form.question_audio}
                        onChange={v => set('question_audio', v)}
                        type="audio"
                        accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Bắt đầu (s)</label>
                            <input
                                type="number" min={0}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                value={form.audio_start_time}
                                onChange={e => set('audio_start_time', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Kết thúc (s)</label>
                            <input
                                type="number" min={0}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                value={form.audio_end_time}
                                onChange={e => set('audio_end_time', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Số lần phát</label>
                            <select
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                value={form.audio_play_count}
                                onChange={e => set('audio_play_count', parseInt(e.target.value))}
                            >
                                <option value={1}>1 lần</option>
                                <option value={2}>2 lần</option>
                                <option value={3}>3 lần</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MCQ Options — multiple_choice / error_identify ── */}
            {(type === 'multiple_choice' || type === 'error_identify') && (
                <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-2">
                        {type === 'error_identify' ? 'Các câu (chọn câu sai)' : 'Đáp án A, B, C, D'}
                    </label>
                    <div className="space-y-2">
                        {['A', 'B', 'C', 'D'].map((opt, idx) => (
                            <div key={opt} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                form.correct_answer === opt
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                    : 'border-[var(--border)]'
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => set('correct_answer', opt)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                                        form.correct_answer === opt
                                            ? 'bg-green-500 text-white'
                                            : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                                    }`}
                                >
                                    {opt}
                                </button>
                                <input
                                    type="text"
                                    placeholder={type === 'error_identify' ? `Câu ${opt}` : `Đáp án ${opt}`}
                                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                                    value={form.options[idx] || ''}
                                    onChange={e => updateOption(idx, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── True / False ── */}
            {type === 'true_false' && (
                <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-2">Đáp án đúng</label>
                    <div className="grid grid-cols-2 gap-3">
                        {(['Đúng', 'Sai'] as const).map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => set('correct_answer', val)}
                                className={`p-4 rounded-xl border-2 text-center font-semibold transition-all ${
                                    form.correct_answer === val
                                        ? val === 'Đúng'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                                }`}
                            >
                                <span className="text-2xl block mb-1">{val === 'Đúng' ? '✅' : '❌'}</span>
                                {val}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Image match — 4 images with radio ── */}
            {type === 'image_match' && (
                <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-2">
                        Hình ảnh đáp án (A, B, C, D)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {['A', 'B', 'C', 'D'].map((opt, idx) => (
                            <div key={opt} className={`p-2 rounded-lg border-2 transition-colors ${
                                form.correct_answer === opt
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                    : 'border-[var(--border)]'
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-[var(--text-muted)]">{opt}</span>
                                    <button
                                        type="button"
                                        onClick={() => set('correct_answer', opt)}
                                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                            form.correct_answer === opt
                                                ? 'bg-green-500 text-white'
                                                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                                        }`}
                                    >
                                        {form.correct_answer === opt ? '✓ Đúng' : 'Chọn'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder={`Mô tả ${opt}`}
                                    className="w-full px-2 py-1 border rounded text-xs mb-2"
                                    value={form.options[idx] || ''}
                                    onChange={e => updateOption(idx, e.target.value)}
                                />
                                <UploadField
                                    label=""
                                    value={form.option_images[idx] || ''}
                                    onChange={v => updateOptionImage(idx, v)}
                                    type="image"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Fill blank — answer input ── */}
            {type === 'fill_blank' && (
                <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg mb-3">
                        💡 Dùng <code className="font-mono">＿＿</code> hoặc <code className="font-mono">___</code> trong nội dung câu hỏi để đánh dấu chỗ trống
                    </p>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Đáp án đúng</label>
                    <input
                        type="text"
                        placeholder="VD: 好  —  Nhiều chỗ trống: answer1||answer2"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        value={form.correct_answer}
                        onChange={e => set('correct_answer', e.target.value)}
                    />
                </div>
            )}

            {/* ── Sentence order — MCQ-compatible: 4 sentence options, pick correct order ── */}
            {type === 'sentence_order' && (
                <div className="space-y-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg">
                        💡 Nhập các phương án sắp xếp (A/B/C/D). Chọn phương án đúng.
                    </p>
                    <div className="space-y-2">
                        {['A', 'B', 'C', 'D'].map((opt, idx) => (
                            <div key={opt} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                form.correct_answer === opt
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                    : 'border-[var(--border)]'
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => set('correct_answer', opt)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                                        form.correct_answer === opt
                                            ? 'bg-green-500 text-white'
                                            : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                                    }`}
                                >
                                    {opt}
                                </button>
                                <input
                                    type="text"
                                    placeholder={`Câu sắp xếp ${opt}`}
                                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                                    value={form.options[idx] || ''}
                                    onChange={e => updateOption(idx, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Short answer ── */}
            {type === 'short_answer' && (
                <div className="space-y-3">
                    <UploadField
                        label="Ảnh kèm theo (tùy chọn)"
                        value={form.question_image}
                        onChange={v => set('question_image', v)}
                        type="image"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                    />
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">Đáp án mẫu</label>
                        <textarea
                            placeholder="Nhập đáp án mẫu..."
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            rows={2}
                            value={form.correct_answer}
                            onChange={e => set('correct_answer', e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ── Question image — for types not handled above ── */}
            {type !== 'short_answer' && type !== 'image_match' && (
                <UploadField
                    label="Ảnh câu hỏi (tùy chọn)"
                    value={form.question_image}
                    onChange={v => set('question_image', v)}
                    type="image"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                />
            )}

            {/* ── Footer: Points + Difficulty + Explanation ── */}
            <div className="border-t border-[var(--border)] pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">Điểm</label>
                        <input
                            type="number" min={1}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            value={form.points}
                            onChange={e => set('points', parseInt(e.target.value) || 1)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">Độ khó</label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            value={form.difficulty}
                            onChange={e => set('difficulty', parseInt(e.target.value))}
                        >
                            <option value={1}>1 — Dễ</option>
                            <option value={2}>2 — Trung bình</option>
                            <option value={3}>3 — Khó</option>
                            <option value={4}>4 — Rất khó</option>
                            <option value={5}>5 — Siêu khó</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Giải thích đáp án</label>
                    <textarea
                        placeholder="Giải thích vì sao đáp án đúng..."
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        rows={2}
                        value={form.explanation}
                        onChange={e => set('explanation', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
