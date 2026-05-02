'use client';

import { useEffect, useState } from 'react';
import type { QuestionFormData } from './hsk-types';
import { UploadField } from './UploadField';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface QuestionFormByTypeProps {
    form: QuestionFormData;
    onChange: (form: QuestionFormData) => void;
    sectionType: string;
    sectionId?: number;   // để fetch groups khi cần group_id
}

interface GroupOption {
    id: number;
    group_type: string;
    title_vi: string | null;
    order_index: number;
}

const GROUP_TYPE_REQUIRED: Record<string, 'image_grid' | 'word_bank' | 'reply_bank' | undefined> = {
    image_grid_match: 'image_grid',
    word_bank_fill: 'word_bank',
    reply_match: 'reply_bank',
};

export function QuestionFormByType({ form, onChange, sectionType, sectionId }: QuestionFormByTypeProps) {
    const isListening = sectionType === 'listening';
    const type = form.question_type;
    const requiredGroupType = GROUP_TYPE_REQUIRED[type];

    const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);

    // Fetch groups khi cần (image_grid_match / word_bank_fill / reply_match)
    useEffect(() => {
        if (!requiredGroupType || !sectionId) return;
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        fetch(`${API_BASE}/api/hsk-exams/sections/${sectionId}/groups`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(d => {
                const all: GroupOption[] = d.data || [];
                setGroupOptions(all.filter(g => g.group_type === requiredGroupType));
            })
            .catch(() => setGroupOptions([]));
    }, [requiredGroupType, sectionId]);

    const set = <K extends keyof QuestionFormData>(key: K, value: QuestionFormData[K]) => {
        onChange({ ...form, [key]: value });
    };

    const updateOption = (idx: number, value: string) => {
        const next = [...form.options];
        next[idx] = value;
        onChange({ ...form, options: next });
    };

    const updateOptionPinyin = (idx: number, value: string) => {
        const next = [...(form.options_pinyin || ['', '', '', ''])];
        next[idx] = value;
        onChange({ ...form, options_pinyin: next });
    };

    const updateOptionImage = (idx: number, value: string) => {
        const next = [...form.option_images];
        next[idx] = value;
        onChange({ ...form, option_images: next });
    };

    const addOption = () => {
        if (form.options.length >= 4) return;
        onChange({
            ...form,
            options: [...form.options, ''],
            options_pinyin: [...(form.options_pinyin || []), ''],
            option_images: [...form.option_images, ''],
        });
    };

    const removeOption = (idx: number) => {
        if (form.options.length <= 3) { alert('Tối thiểu 3 đáp án'); return; }
        onChange({
            ...form,
            options: form.options.filter((_, i) => i !== idx),
            options_pinyin: (form.options_pinyin || []).filter((_, i) => i !== idx),
            option_images: form.option_images.filter((_, i) => i !== idx),
        });
    };

    // Sentence_assembly chunks helpers
    const chunks = (form.meta as { chunks?: { text: string }[] } | null)?.chunks || [];
    const updateChunks = (next: { text: string }[]) => {
        const meta = { ...(form.meta || {}), chunks: next };
        onChange({ ...form, meta });
    };

    // Fill_hanzi helpers
    const fillHanziMeta = (form.meta || {}) as { context_zh_with_blank?: string; pinyin_hint?: string };
    const updateFillHanzi = (patch: Partial<{ context_zh_with_blank: string; pinyin_hint: string }>) => {
        const meta = { ...(form.meta || {}), ...patch };
        onChange({ ...form, meta });
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
                            <label className="text-xs text-[var(--text-muted)]">Số lần phát (full test)</label>
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
                    {/* Transcript — văn bản gốc, hiện trong tab "Đáp án/transcript" */}
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">
                            Transcript (văn bản gốc của audio)
                        </label>
                        <textarea
                            className="w-full px-2 py-1.5 border rounded-lg text-sm hanzi"
                            rows={3}
                            placeholder="VD: 男：你好，李丽！很久不见。&#10;女：你好，最近怎么样？"
                            value={form.transcript}
                            onChange={e => set('transcript', e.target.value)}
                        />
                        <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">
                            Sẽ hiện trong tab Đáp án/transcript. Cũng dùng để gen audio bằng edge-tts (Phase F).
                        </p>
                    </div>
                </div>
            )}

            {/* ── Group selector — chỉ hiện khi type cần shared resource ── */}
            {requiredGroupType && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200/50 dark:border-purple-800/30">
                    <label className="text-xs font-semibold text-purple-600 dark:text-purple-400 block mb-2">
                        🔗 Group ({requiredGroupType}) dùng chung cho cụm câu *
                    </label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        value={form.group_id ?? ''}
                        onChange={e => set('group_id', e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">— Chọn group —</option>
                        {groupOptions.map(g => (
                            <option key={g.id} value={g.id}>
                                #{g.order_index} — {g.title_vi || `Group ${g.id}`}
                            </option>
                        ))}
                    </select>
                    {groupOptions.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Section này chưa có group nào loại <code>{requiredGroupType}</code>. Tạo group trong panel Groups trước.
                        </p>
                    )}
                </div>
            )}

            {/* ── Passage / Statement — cho paragraph + ★ types ── */}
            {(type === 'true_false' || type === 'multiple_choice') && (
                <div className="space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-800/30">
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">
                            📄 Đoạn văn (passage) — dùng cho HSK 2/3 reading paragraph
                        </label>
                        <textarea
                            className="w-full px-2 py-1.5 border rounded-lg text-sm hanzi"
                            rows={3}
                            placeholder="(Tuỳ chọn) Nhập đoạn văn dài; câu ★ ở field Statement bên dưới."
                            value={form.passage}
                            onChange={e => set('passage', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">
                            ★ Câu khẳng định (statement) — judge T/F hoặc trả lời MCQ
                        </label>
                        <input
                            type="text"
                            className="w-full px-2 py-1.5 border rounded-lg text-sm hanzi"
                            placeholder="(Tuỳ chọn) VD: 他是老师"
                            value={form.statement}
                            onChange={e => set('statement', e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ── MCQ Options — multiple_choice / error_identify ── */}
            {(type === 'multiple_choice' || type === 'error_identify') && (
                <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-2">
                        {type === 'error_identify'
                            ? 'Các câu (chọn câu sai)'
                            : `Đáp án (${form.options.length} options) — Hán + Pinyin`}
                    </label>
                    <div className="space-y-2">
                        {form.options.map((optText, idx) => {
                            const label = String.fromCharCode(65 + idx);
                            const selected = form.correct_answer === label;
                            return (
                                <div key={idx} className={`p-2 rounded-lg border transition-colors ${
                                    selected ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-[var(--border)]'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => set('correct_answer', label)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                                                selected
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                        <input
                                            type="text"
                                            placeholder={type === 'error_identify' ? `Câu ${label}` : `Hán ${label}`}
                                            className="flex-1 px-3 py-1.5 border rounded-lg text-sm hanzi"
                                            value={optText}
                                            onChange={e => updateOption(idx, e.target.value)}
                                        />
                                        {form.options.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() => removeOption(idx)}
                                                className="text-red-500 hover:text-red-700 text-xs"
                                                title="Xoá option"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    {/* Pinyin per option (chỉ MCQ, không error_identify) */}
                                    {type === 'multiple_choice' && (
                                        <input
                                            type="text"
                                            placeholder={`Pinyin ${label} (tuỳ chọn)`}
                                            className="w-full mt-1 px-3 py-1 border rounded text-xs italic ml-10"
                                            style={{ width: 'calc(100% - 40px)' }}
                                            value={(form.options_pinyin || [])[idx] || ''}
                                            onChange={e => updateOptionPinyin(idx, e.target.value)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {form.options.length < 4 && (
                        <button
                            type="button"
                            onClick={addOption}
                            className="text-xs text-[var(--primary)] hover:underline mt-2"
                        >
                            + Thêm option {String.fromCharCode(65 + form.options.length)}
                        </button>
                    )}
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

            {/* ── Group-based types: image_grid_match / word_bank_fill / reply_match ── */}
            {(type === 'image_grid_match' || type === 'word_bank_fill' || type === 'reply_match') && (
                <div className="space-y-2">
                    <label className="text-xs text-[var(--text-muted)] block">
                        Đáp án đúng — chọn 1 chữ cái trong group
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {['A', 'B', 'C', 'D', 'E', 'F'].map(letter => {
                            const selected = form.correct_answer === letter;
                            return (
                                <button
                                    key={letter}
                                    type="button"
                                    onClick={() => set('correct_answer', letter)}
                                    className={`w-12 h-12 rounded-lg border-2 font-bold text-base transition-all ${
                                        selected
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                                    }`}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] italic">
                        Chỉ A-F, tương ứng với item trong group đã chọn ở trên.
                    </p>
                </div>
            )}

            {/* ── Sentence assembly — chunks ── */}
            {type === 'sentence_assembly' && (
                <div className="space-y-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg">
                        💡 Mỗi mẩu (chunk) là 1 từ/cụm từ để người làm bài lắp ghép thành câu hoàn chỉnh.
                    </p>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-2">
                            Các mẩu (chunks) — sẽ hiện ngẫu nhiên
                        </label>
                        <div className="space-y-2">
                            {chunks.map((chunk, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--text-muted)] w-6 text-center">{idx + 1}</span>
                                    <input
                                        type="text"
                                        placeholder={`Mẩu ${idx + 1} (VD: 我 / 是 / 学生)`}
                                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm hanzi"
                                        value={chunk.text}
                                        onChange={e => {
                                            const next = [...chunks];
                                            next[idx] = { text: e.target.value };
                                            updateChunks(next);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updateChunks(chunks.filter((_, i) => i !== idx))}
                                        className="text-red-500 hover:text-red-700 text-xs px-1"
                                        title="Xoá"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => updateChunks([...chunks, { text: '' }])}
                            className="text-xs text-[var(--primary)] hover:underline mt-2"
                        >
                            + Thêm mẩu
                        </button>
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">
                            Câu hoàn chỉnh (đáp án đúng — chấm loose: bỏ qua dấu câu, khoảng trắng)
                        </label>
                        <textarea
                            className="w-full px-3 py-2 border rounded-lg text-sm hanzi"
                            rows={2}
                            placeholder="VD: 我是学生。"
                            value={form.correct_answer}
                            onChange={e => set('correct_answer', e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ── Fill hanzi — viết chữ Hán theo pinyin gợi ý ── */}
            {type === 'fill_hanzi' && (
                <div className="space-y-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg">
                        💡 Người làm bài viết 1 chữ Hán theo pinyin gợi ý, điền vào chỗ <code>( )</code> trong câu.
                    </p>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">
                            Câu chứa chỗ trống — dùng <code>( )</code> để đánh dấu vị trí điền
                        </label>
                        <textarea
                            className="w-full px-3 py-2 border rounded-lg text-sm hanzi"
                            rows={2}
                            placeholder="VD: 我喜欢吃( )果。"
                            value={fillHanziMeta.context_zh_with_blank || ''}
                            onChange={e => updateFillHanzi({ context_zh_with_blank: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">
                                Pinyin gợi ý
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg text-sm italic"
                                placeholder="VD: shuǐ"
                                value={fillHanziMeta.pinyin_hint || ''}
                                onChange={e => updateFillHanzi({ pinyin_hint: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">
                                Chữ Hán đúng (1 ký tự)
                            </label>
                            <input
                                type="text"
                                maxLength={3}
                                className="w-full px-3 py-2 border rounded-lg text-sm hanzi text-center text-lg"
                                placeholder="水"
                                value={form.correct_answer}
                                onChange={e => set('correct_answer', e.target.value)}
                            />
                        </div>
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
