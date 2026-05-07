'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import type { TextbookWritingExercise } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
    lessonId: number;
    items: TextbookWritingExercise[];
    token: string | null;
    onChanged: () => Promise<void>;
}

interface Draft {
    id?: number;
    prompt_vi: string;
    prompt_zh: string;
    expected_keywords: string;
    sample_answer_zh: string;
    sample_answer_pinyin: string;
    sample_answer_vi: string;
    min_chars: number;
    max_chars: number;
    order_index: number;
}

const empty = (orderIndex = 0): Draft => ({
    prompt_vi: '',
    prompt_zh: '',
    expected_keywords: '',
    sample_answer_zh: '',
    sample_answer_pinyin: '',
    sample_answer_vi: '',
    min_chars: 5,
    max_chars: 200,
    order_index: orderIndex,
});

function exerciseToDraft(e: TextbookWritingExercise): Draft {
    return {
        id: e.id,
        prompt_vi: e.prompt_vi,
        prompt_zh: e.prompt_zh || '',
        expected_keywords: Array.isArray(e.expected_keywords) ? e.expected_keywords.join(', ') : '',
        sample_answer_zh: e.sample_answer_zh || '',
        sample_answer_pinyin: e.sample_answer_pinyin || '',
        sample_answer_vi: e.sample_answer_vi || '',
        min_chars: e.min_chars,
        max_chars: e.max_chars,
        order_index: e.order_index,
    };
}

export function WritingTab({ lessonId, items, token, onChanged }: Props) {
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);

    const set = (k: keyof Draft, v: string | number) => {
        if (draft) setDraft({ ...draft, [k]: v });
    };

    const save = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            // BE textbookLesson.model.js destructures camelCase keys — keep this in sync
            // with `addWritingExercise` / `updateWritingExercise` in that file.
            const body = {
                promptVi: draft.prompt_vi.trim(),
                promptZh: draft.prompt_zh.trim() || null,
                expectedKeywords: draft.expected_keywords
                    .split(',').map(s => s.trim()).filter(Boolean),
                sampleAnswerZh: draft.sample_answer_zh.trim() || null,
                sampleAnswerPinyin: draft.sample_answer_pinyin.trim() || null,
                sampleAnswerVi: draft.sample_answer_vi.trim() || null,
                minChars: draft.min_chars,
                maxChars: draft.max_chars,
                orderIndex: draft.order_index,
            };
            const url = draft.id
                ? `${API_BASE}/api/lessons/${lessonId}/writing/${draft.id}`
                : `${API_BASE}/api/lessons/${lessonId}/writing`;
            const method = draft.id ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                alert(`Lỗi: ${d.message || 'Không thể lưu'}`);
                return;
            }
            await onChanged();
            setDraft(null);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: number) => {
        if (!confirm('Xóa bài tập viết này?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/writing/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) await onChanged();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-muted)]">
                    Bài tập viết — học viên nộp đoạn văn, chấm rule-based theo keyword.
                </p>
                {!draft && (
                    <Button
                        onClick={() => setDraft(empty(
                            items.length === 0 ? 0 : Math.max(...items.map(i => i.order_index)) + 1
                        ))}
                        className="flex items-center gap-1.5"
                    >
                        <Icon name="add" size="sm" />
                        Thêm bài tập viết
                    </Button>
                )}
            </div>

            {draft && (
                <div className="border-2 border-[var(--primary)]/40 bg-[var(--surface)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-main)]">
                            {draft.id ? `Sửa bài tập #${draft.id}` : 'Bài tập mới'}
                        </h3>
                        <button onClick={() => setDraft(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                            <Icon name="close" size="sm" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Đề bài (tiếng Việt) *</label>
                        <textarea
                            required
                            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[var(--primary)] outline-none resize-none h-16"
                            placeholder="VD: Viết 3 câu giới thiệu bản thân"
                            value={draft.prompt_vi}
                            onChange={e => set('prompt_vi', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Đề bài (tiếng Trung) — optional</label>
                        <textarea
                            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] hanzi focus:border-[var(--primary)] outline-none resize-none h-16"
                            placeholder="写三句话介绍你自己"
                            value={draft.prompt_zh}
                            onChange={e => set('prompt_zh', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">
                            Keywords kỳ vọng <span className="text-[var(--text-muted)]">(phẩy ngăn cách — chấm rule-based)</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[var(--primary)] outline-none"
                            placeholder="我, 叫, 是"
                            value={draft.expected_keywords}
                            onChange={e => set('expected_keywords', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Min chars</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none"
                                value={draft.min_chars}
                                onChange={e => set('min_chars', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Max chars</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none"
                                value={draft.max_chars}
                                onChange={e => set('max_chars', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Thứ tự</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none"
                                value={draft.order_index}
                                onChange={e => set('order_index', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <details className="rounded-lg border border-[var(--border)] p-3">
                        <summary className="cursor-pointer text-xs text-[var(--text-secondary)] font-medium">
                            Đáp án mẫu (optional — hiện sau khi user nộp)
                        </summary>
                        <div className="space-y-2 mt-3">
                            <textarea
                                placeholder="Sample tiếng Trung..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] hanzi outline-none resize-none h-16"
                                value={draft.sample_answer_zh}
                                onChange={e => set('sample_answer_zh', e.target.value)}
                            />
                            <textarea
                                placeholder="Pinyin..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none resize-none h-16"
                                value={draft.sample_answer_pinyin}
                                onChange={e => set('sample_answer_pinyin', e.target.value)}
                            />
                            <textarea
                                placeholder="Bản dịch tiếng Việt..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none resize-none h-16"
                                value={draft.sample_answer_vi}
                                onChange={e => set('sample_answer_vi', e.target.value)}
                            />
                        </div>
                    </details>

                    <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                        <Button onClick={save} disabled={saving || !draft.prompt_vi.trim()}>
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </Button>
                        <Button variant="ghost" onClick={() => setDraft(null)}>Hủy</Button>
                    </div>
                </div>
            )}

            {items.length === 0 && !draft ? (
                <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)] text-sm">
                    Chưa có bài tập viết.
                </div>
            ) : (
                <div className="space-y-2">
                    {[...items].sort((a, b) => a.order_index - b.order_index).map(ex => (
                        <div key={ex.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                            <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] shrink-0">
                                    {ex.order_index}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[var(--text-main)]">{ex.prompt_vi}</p>
                                    {ex.prompt_zh && (
                                        <p className="text-sm hanzi text-[var(--text-secondary)] mt-1">{ex.prompt_zh}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                                        <span>{ex.min_chars}–{ex.max_chars} ký tự</span>
                                        {ex.expected_keywords?.length > 0 && (
                                            <span>{ex.expected_keywords.length} keyword</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => setDraft(exerciseToDraft(ex))}
                                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-secondary)]"
                                        title="Sửa"
                                    >
                                        <Icon name="edit" size="sm" />
                                    </button>
                                    <button
                                        onClick={() => remove(ex.id)}
                                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                                        title="Xóa"
                                    >
                                        <Icon name="delete" size="sm" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
