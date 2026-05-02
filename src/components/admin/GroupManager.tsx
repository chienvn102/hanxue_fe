'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { UploadField } from './UploadField';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export type GroupType = 'image_grid' | 'word_bank' | 'reply_bank' | 'passage';

interface Group {
    id: number;
    section_id: number;
    group_type: GroupType;
    title_vi: string | null;
    instructions_vi: string | null;
    content: GroupContent | null;
    order_index: number;
}

interface ImageGridContent {
    items: { label: string; image_url: string; alt_vi?: string }[];
    example?: { label: string; content: { zh: string; pinyin?: string } };
}
interface WordBankContent {
    items: { label: string; word: string; pinyin?: string }[];
    example?: { label: string; sentence_zh: string; sentence_pinyin?: string };
}
interface ReplyBankContent {
    items: { label: string; sentence_zh: string; sentence_pinyin?: string }[];
    example?: { label: string; prompt_zh: string; prompt_pinyin?: string };
}
interface PassageContent {
    passage_zh: string;
    passage_pinyin?: string;
    passage_vi?: string;
}
type GroupContent = ImageGridContent | WordBankContent | ReplyBankContent | PassageContent;

const DEFAULT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const GROUP_TYPE_LABELS: Record<GroupType, string> = {
    image_grid: '🖼️ Lưới ảnh (Image Grid)',
    word_bank: '📝 Ngân hàng từ (Word Bank)',
    reply_bank: '💬 Ngân hàng câu trả lời (Reply Bank)',
    passage: '📄 Đoạn văn (Passage)',
};

interface Props {
    sectionId: number;
    token: string | null;
}

export function GroupManager({ sectionId, token }: Props) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);

    const fetchGroups = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/hsk-exams/sections/${sectionId}/groups`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setGroups(data.data || []);
        } catch (e) {
            console.error('Fetch groups error:', e);
        } finally {
            setLoading(false);
        }
    }, [sectionId, token]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    const handleDelete = async (id: number) => {
        if (!confirm('Xoá group này? (câu hỏi gắn vào sẽ mất link group)')) return;
        try {
            const res = await fetch(`${API_BASE}/api/hsk-exams/groups/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) fetchGroups();
            else alert(data.message || 'Lỗi xoá');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Icon name="dashboard" size="sm" className="text-purple-500" />
                    <span className="text-xs font-semibold uppercase text-purple-500">
                        Groups (shared resource) — {groups.length}
                    </span>
                </div>
                <Button
                    onClick={() => { setEditingGroup(null); setShowModal(true); }}
                    className="text-xs px-2 py-1 flex items-center gap-1"
                >
                    <Icon name="add" size="xs" />
                    Thêm group
                </Button>
            </div>

            {loading && <p className="text-xs text-[var(--text-muted)]">Đang tải...</p>}

            {groups.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic">
                    Chưa có group nào. Group dùng cho image_grid_match / word_bank_fill / reply_match.
                </p>
            ) : (
                <ul className="space-y-1.5">
                    {groups.map(g => (
                        <li key={g.id} className="flex items-center justify-between text-sm bg-[var(--surface)] rounded px-2 py-1.5 border border-[var(--border)]">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-mono text-[var(--text-muted)]">#{g.order_index}</span>
                                <span className="text-xs">{GROUP_TYPE_LABELS[g.group_type]}</span>
                                {g.title_vi && <span className="text-xs text-[var(--text-secondary)] truncate">— {g.title_vi}</span>}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => { setEditingGroup(g); setShowModal(true); }} className="p-0.5 text-blue-400 hover:text-blue-600">
                                    <Icon name="edit" size="xs" />
                                </button>
                                <button onClick={() => handleDelete(g.id)} className="p-0.5 text-[var(--text-muted)] hover:text-red-500">
                                    <Icon name="delete" size="xs" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showModal && (
                <GroupEditorModal
                    sectionId={sectionId}
                    token={token}
                    group={editingGroup}
                    onClose={() => { setShowModal(false); setEditingGroup(null); }}
                    onSaved={() => { fetchGroups(); setShowModal(false); setEditingGroup(null); }}
                />
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * Modal editor — tạo / sửa group
 * ───────────────────────────────────────────────────────────────────── */
function GroupEditorModal({
    sectionId, token, group, onClose, onSaved,
}: {
    sectionId: number;
    token: string | null;
    group: Group | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [type, setType] = useState<GroupType>(group?.group_type || 'image_grid');
    const [titleVi, setTitleVi] = useState(group?.title_vi || '');
    const [instructionsVi, setInstructionsVi] = useState(group?.instructions_vi || '');
    const [orderIndex, setOrderIndex] = useState(group?.order_index || 0);
    const [content, setContent] = useState<GroupContent | null>(group?.content || null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!content) {
            alert('Nội dung group chưa hợp lệ');
            return;
        }
        try {
            setSaving(true);
            const body = {
                group_type: type,
                title_vi: titleVi || null,
                instructions_vi: instructionsVi || null,
                content,
                order_index: orderIndex,
            };
            const url = group
                ? `${API_BASE}/api/hsk-exams/groups/${group.id}`
                : `${API_BASE}/api/hsk-exams/sections/${sectionId}/groups`;
            const res = await fetch(url, {
                method: group ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success || data.data) {
                onSaved();
            } else {
                alert(data.message || 'Lỗi lưu group');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{group ? 'Sửa group' : 'Tạo group mới'}</h3>
                    <button onClick={onClose} className="p-1 text-[var(--text-muted)]">
                        <Icon name="close" size="sm" />
                    </button>
                </div>

                <div className="space-y-3">
                    {!group && (
                        <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">Loại group</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                value={type}
                                onChange={e => { setType(e.target.value as GroupType); setContent(null); }}
                            >
                                {(Object.keys(GROUP_TYPE_LABELS) as GroupType[]).map(t => (
                                    <option key={t} value={t}>{GROUP_TYPE_LABELS[t]}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs text-[var(--text-muted)] block mb-1">Tiêu đề (vi, tuỳ chọn)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                value={titleVi}
                                onChange={e => setTitleVi(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1">Order</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                value={orderIndex}
                                onChange={e => setOrderIndex(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">Hướng dẫn (vi, tuỳ chọn)</label>
                        <textarea
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            rows={2}
                            value={instructionsVi}
                            onChange={e => setInstructionsVi(e.target.value)}
                        />
                    </div>

                    {/* Content editor per type */}
                    <div className="border-t border-[var(--border)] pt-3 mt-3">
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                            Nội dung — {GROUP_TYPE_LABELS[type]}
                        </h4>
                        {type === 'image_grid' && <ImageGridEditor content={content as ImageGridContent | null} onChange={setContent} />}
                        {type === 'word_bank' && <WordBankEditor content={content as WordBankContent | null} onChange={setContent} />}
                        {type === 'reply_bank' && <ReplyBankEditor content={content as ReplyBankContent | null} onChange={setContent} />}
                        {type === 'passage' && <PassageEditor content={content as PassageContent | null} onChange={setContent} />}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Đang lưu...' : (group ? 'Lưu thay đổi' : 'Tạo group')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * Editor: image_grid (5-6 ảnh A-F)
 * ───────────────────────────────────────────────────────────────────── */
function ImageGridEditor({ content, onChange }: { content: ImageGridContent | null; onChange: (c: ImageGridContent) => void }) {
    const items = content?.items || DEFAULT_LABELS.slice(0, 6).map(l => ({ label: l, image_url: '', alt_vi: '' }));
    const example = content?.example;

    const update = (idx: number, patch: Partial<{ label: string; image_url: string; alt_vi: string }>) => {
        const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
        onChange({ ...content, items: next, example });
    };

    const addItem = () => {
        if (items.length >= 6) return;
        const nextLabel = DEFAULT_LABELS[items.length];
        onChange({ ...content, items: [...items, { label: nextLabel, image_url: '', alt_vi: '' }], example });
    };

    const removeItem = (idx: number) => {
        if (items.length <= 5) { alert('Tối thiểu 5 ảnh'); return; }
        const next = items.filter((_, i) => i !== idx);
        onChange({ ...content, items: next, example });
    };

    return (
        <div className="space-y-2">
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded">
                💡 Bắt buộc 5 hoặc 6 ảnh (label A-E hoặc A-F).
            </p>
            <div className="grid grid-cols-2 gap-3">
                {items.map((item, idx) => (
                    <div key={idx} className="p-2 border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)]/30">
                        <div className="flex items-center justify-between mb-1.5">
                            <input
                                type="text"
                                maxLength={1}
                                value={item.label}
                                onChange={e => update(idx, { label: e.target.value.toUpperCase() })}
                                className="w-10 px-2 py-1 border rounded text-center font-bold text-sm"
                            />
                            {items.length > 5 && (
                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                                    <Icon name="close" size="xs" />
                                </button>
                            )}
                        </div>
                        <UploadField
                            label=""
                            value={item.image_url}
                            onChange={v => update(idx, { image_url: v })}
                            type="image"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                        />
                        <input
                            type="text"
                            placeholder="Alt (vi, optional)"
                            className="w-full mt-1.5 px-2 py-1 border rounded text-xs"
                            value={item.alt_vi || ''}
                            onChange={e => update(idx, { alt_vi: e.target.value })}
                        />
                    </div>
                ))}
            </div>
            {items.length < 6 && (
                <button onClick={addItem} className="text-xs text-[var(--primary)] hover:underline">
                    + Thêm ảnh thứ {items.length + 1} (tối đa 6)
                </button>
            )}
            <div className="border-t border-[var(--border)] pt-2 mt-2">
                <label className="text-xs text-[var(--text-muted)] block mb-1">Ví dụ (tuỳ chọn) — minh hoạ cho user</label>
                <div className="grid grid-cols-3 gap-2">
                    <input
                        type="text"
                        placeholder="Label"
                        maxLength={1}
                        className="px-2 py-1 border rounded text-sm uppercase"
                        value={example?.label || ''}
                        onChange={e => onChange({
                            items,
                            example: { ...example, label: e.target.value.toUpperCase(), content: example?.content || { zh: '', pinyin: '' } },
                        })}
                    />
                    <input
                        type="text"
                        placeholder="Hán"
                        className="px-2 py-1 border rounded text-sm hanzi col-span-2"
                        value={example?.content?.zh || ''}
                        onChange={e => onChange({
                            items,
                            example: { label: example?.label || '', content: { ...example?.content, zh: e.target.value } },
                        })}
                    />
                    <input
                        type="text"
                        placeholder="Pinyin"
                        className="px-2 py-1 border rounded text-sm italic col-span-3"
                        value={example?.content?.pinyin || ''}
                        onChange={e => onChange({
                            items,
                            example: { label: example?.label || '', content: { zh: example?.content?.zh || '', pinyin: e.target.value } },
                        })}
                    />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * Editor: word_bank (5-6 từ A-F)
 * ───────────────────────────────────────────────────────────────────── */
function WordBankEditor({ content, onChange }: { content: WordBankContent | null; onChange: (c: WordBankContent) => void }) {
    const items = content?.items || DEFAULT_LABELS.slice(0, 6).map(l => ({ label: l, word: '', pinyin: '' }));
    const example = content?.example;

    const update = (idx: number, patch: Partial<{ label: string; word: string; pinyin: string }>) => {
        const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
        onChange({ items: next, example });
    };

    const addItem = () => {
        if (items.length >= 6) return;
        onChange({ items: [...items, { label: DEFAULT_LABELS[items.length], word: '', pinyin: '' }], example });
    };
    const removeItem = (idx: number) => {
        if (items.length <= 5) { alert('Tối thiểu 5'); return; }
        onChange({ items: items.filter((_, i) => i !== idx), example });
    };

    return (
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                        type="text"
                        maxLength={1}
                        className="col-span-1 px-2 py-1.5 border rounded text-center font-bold text-sm uppercase"
                        value={item.label}
                        onChange={e => update(idx, { label: e.target.value.toUpperCase() })}
                    />
                    <input
                        type="text"
                        placeholder="Hán"
                        className="col-span-5 px-2 py-1.5 border rounded text-sm hanzi"
                        value={item.word}
                        onChange={e => update(idx, { word: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Pinyin"
                        className="col-span-5 px-2 py-1.5 border rounded text-sm italic"
                        value={item.pinyin || ''}
                        onChange={e => update(idx, { pinyin: e.target.value })}
                    />
                    {items.length > 5 && (
                        <button onClick={() => removeItem(idx)} className="col-span-1 text-red-500 hover:text-red-700">
                            <Icon name="close" size="xs" />
                        </button>
                    )}
                </div>
            ))}
            {items.length < 6 && (
                <button onClick={addItem} className="text-xs text-[var(--primary)] hover:underline">
                    + Thêm từ thứ {items.length + 1}
                </button>
            )}
            <div className="border-t border-[var(--border)] pt-2 mt-2">
                <label className="text-xs text-[var(--text-muted)] block mb-1">Ví dụ (tuỳ chọn)</label>
                <div className="grid grid-cols-12 gap-2">
                    <input
                        type="text"
                        maxLength={1}
                        className="col-span-1 px-2 py-1 border rounded text-center text-sm uppercase"
                        value={example?.label || ''}
                        onChange={e => onChange({ items, example: { label: e.target.value.toUpperCase(), sentence_zh: example?.sentence_zh || '', sentence_pinyin: example?.sentence_pinyin } })}
                    />
                    <input
                        type="text"
                        placeholder="Câu mẫu Hán có ( )"
                        className="col-span-11 px-2 py-1 border rounded text-sm hanzi"
                        value={example?.sentence_zh || ''}
                        onChange={e => onChange({ items, example: { label: example?.label || '', sentence_zh: e.target.value, sentence_pinyin: example?.sentence_pinyin } })}
                    />
                    <input
                        type="text"
                        placeholder="Pinyin câu mẫu"
                        className="col-span-12 px-2 py-1 border rounded text-sm italic"
                        value={example?.sentence_pinyin || ''}
                        onChange={e => onChange({ items, example: { label: example?.label || '', sentence_zh: example?.sentence_zh || '', sentence_pinyin: e.target.value } })}
                    />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * Editor: reply_bank (5-6 câu A-F)
 * ───────────────────────────────────────────────────────────────────── */
function ReplyBankEditor({ content, onChange }: { content: ReplyBankContent | null; onChange: (c: ReplyBankContent) => void }) {
    const items = content?.items || DEFAULT_LABELS.slice(0, 6).map(l => ({ label: l, sentence_zh: '', sentence_pinyin: '' }));
    const example = content?.example;

    const update = (idx: number, patch: Partial<{ label: string; sentence_zh: string; sentence_pinyin: string }>) => {
        const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
        onChange({ items: next, example });
    };

    const addItem = () => {
        if (items.length >= 6) return;
        onChange({ items: [...items, { label: DEFAULT_LABELS[items.length], sentence_zh: '', sentence_pinyin: '' }], example });
    };
    const removeItem = (idx: number) => {
        if (items.length <= 5) { alert('Tối thiểu 5'); return; }
        onChange({ items: items.filter((_, i) => i !== idx), example });
    };

    return (
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <input
                        type="text"
                        maxLength={1}
                        className="col-span-1 px-2 py-1.5 border rounded text-center font-bold text-sm uppercase"
                        value={item.label}
                        onChange={e => update(idx, { label: e.target.value.toUpperCase() })}
                    />
                    <div className="col-span-10 space-y-1">
                        <input
                            type="text"
                            placeholder="Câu Hán"
                            className="w-full px-2 py-1.5 border rounded text-sm hanzi"
                            value={item.sentence_zh}
                            onChange={e => update(idx, { sentence_zh: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Pinyin"
                            className="w-full px-2 py-1.5 border rounded text-sm italic"
                            value={item.sentence_pinyin || ''}
                            onChange={e => update(idx, { sentence_pinyin: e.target.value })}
                        />
                    </div>
                    {items.length > 5 && (
                        <button onClick={() => removeItem(idx)} className="col-span-1 text-red-500 hover:text-red-700 mt-2">
                            <Icon name="close" size="xs" />
                        </button>
                    )}
                </div>
            ))}
            {items.length < 6 && (
                <button onClick={addItem} className="text-xs text-[var(--primary)] hover:underline">
                    + Thêm câu thứ {items.length + 1}
                </button>
            )}
            <div className="border-t border-[var(--border)] pt-2 mt-2">
                <label className="text-xs text-[var(--text-muted)] block mb-1">Ví dụ — prompt mẫu (tuỳ chọn)</label>
                <div className="grid grid-cols-12 gap-2">
                    <input
                        type="text"
                        maxLength={1}
                        className="col-span-1 px-2 py-1 border rounded text-center text-sm uppercase"
                        value={example?.label || ''}
                        onChange={e => onChange({ items, example: { label: e.target.value.toUpperCase(), prompt_zh: example?.prompt_zh || '', prompt_pinyin: example?.prompt_pinyin } })}
                    />
                    <input
                        type="text"
                        placeholder="Prompt Hán"
                        className="col-span-11 px-2 py-1 border rounded text-sm hanzi"
                        value={example?.prompt_zh || ''}
                        onChange={e => onChange({ items, example: { label: example?.label || '', prompt_zh: e.target.value, prompt_pinyin: example?.prompt_pinyin } })}
                    />
                    <input
                        type="text"
                        placeholder="Pinyin prompt"
                        className="col-span-12 px-2 py-1 border rounded text-sm italic"
                        value={example?.prompt_pinyin || ''}
                        onChange={e => onChange({ items, example: { label: example?.label || '', prompt_zh: example?.prompt_zh || '', prompt_pinyin: e.target.value } })}
                    />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * Editor: passage (đoạn văn dài)
 * ───────────────────────────────────────────────────────────────────── */
function PassageEditor({ content, onChange }: { content: PassageContent | null; onChange: (c: PassageContent) => void }) {
    const c = content || { passage_zh: '', passage_pinyin: '', passage_vi: '' };

    return (
        <div className="space-y-2">
            <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Đoạn văn (Hán) *</label>
                <textarea
                    className="w-full px-3 py-2 border rounded-lg text-sm hanzi"
                    rows={4}
                    value={c.passage_zh}
                    onChange={e => onChange({ ...c, passage_zh: e.target.value })}
                />
            </div>
            <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Pinyin (tuỳ chọn)</label>
                <textarea
                    className="w-full px-3 py-2 border rounded-lg text-sm italic"
                    rows={3}
                    value={c.passage_pinyin || ''}
                    onChange={e => onChange({ ...c, passage_pinyin: e.target.value })}
                />
            </div>
            <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Bản dịch (vi, tuỳ chọn)</label>
                <textarea
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={3}
                    value={c.passage_vi || ''}
                    onChange={e => onChange({ ...c, passage_vi: e.target.value })}
                />
            </div>
        </div>
    );
}
