'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import type { TextbookVocab } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Khớp shape THẬT của GET /api/vocab (camelCase, envelope { data }).
interface VocabSearchResult {
    id: number;
    simplified: string;
    pinyin: string;
    meaningVi: string;
    hskLevel: number | null;
}

interface Props {
    lessonId: number;
    items: TextbookVocab[];
    token: string | null;
    onChanged: () => Promise<void>;
}

export function VocabTab({ lessonId, items, token, onChanged }: Props) {
    const [search, setSearch] = useState('');
    const [hskFilter, setHskFilter] = useState<number | ''>('');
    const [results, setResults] = useState<VocabSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [editingNote, setEditingNote] = useState<{ vocabId: number; note: string } | null>(null);

    useEffect(() => {
        if (!search.trim() && !hskFilter) {
            setResults([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const params = new URLSearchParams();
                if (search.trim()) params.set('q', search.trim());
                if (hskFilter) params.set('hsk', String(hskFilter));
                params.set('limit', '20');
                const res = await fetch(`${API_BASE}/api/vocab?${params}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (!res.ok) { setResults([]); return; }
                const data = await res.json();
                // BE trả { data: [...] } (KHÔNG có field success) → đọc thẳng data.data.
                const list: VocabSearchResult[] = Array.isArray(data?.data) ? data.data : [];
                const attached = new Set(items.map(i => i.id));
                setResults(list.filter(v => !attached.has(v.id)));
            } finally {
                setSearching(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [search, hskFilter, items, token]);

    const attachVocab = async (vocabId: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/vocabulary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vocabularyId: vocabId,
                    orderIndex: items.length === 0 ? 0 : Math.max(...items.map(i => i.order_index)) + 1,
                }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                alert(`Lỗi: ${d.message || 'Không thể thêm từ'}`);
                return;
            }
            await onChanged();
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối');
        }
    };

    const detachVocab = async (vocabId: number) => {
        if (!confirm('Bỏ từ này khỏi bài học?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/vocabulary/${vocabId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) await onChanged();
        } catch (e) {
            console.error(e);
        }
    };

    const updateLink = async (vocabId: number, patch: Partial<{ orderIndex: number; noteVi: string | null }>) => {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/vocabulary/${vocabId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(patch),
            });
            if (res.ok) await onChanged();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Search & attach */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-3">Thêm từ vựng vào bài</h3>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        placeholder="Tìm từ (Hán / pinyin / nghĩa Việt)..."
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select
                        className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] text-sm"
                        value={hskFilter}
                        onChange={e => setHskFilter(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                        <option value="">Mọi HSK</option>
                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>HSK {n}</option>)}
                    </select>
                </div>
                {searching && <p className="text-xs text-[var(--text-muted)]">Đang tìm...</p>}
                {results.length > 0 && (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                        {results.map(v => (
                            <div key={v.id} className="flex items-center gap-3 p-2 rounded hover:bg-[var(--surface-secondary)]">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="hanzi font-semibold">{v.simplified}</span>
                                        <span className="text-xs text-[var(--primary)]">{v.pinyin}</span>
                                        {v.hskLevel && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">HSK {v.hskLevel}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">{v.meaningVi}</p>
                                </div>
                                <button
                                    onClick={() => attachVocab(v.id)}
                                    className="p-1.5 rounded text-[var(--primary)] hover:bg-[var(--primary)]/10"
                                    title="Thêm vào bài"
                                >
                                    <Icon name="add" size="sm" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Attached list */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text-main)]">
                        Từ đã thêm ({items.length})
                    </h3>
                </div>
                {items.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)] text-sm">
                        Chưa có từ vựng nào — dùng ô tìm kiếm phía trên để thêm.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {[...items].sort((a, b) => a.order_index - b.order_index).map(v => (
                            <div key={v.id} className="flex items-start gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                <input
                                    type="number"
                                    className="w-14 px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-center"
                                    value={v.order_index}
                                    onChange={e => updateLink(v.id, { orderIndex: parseInt(e.target.value) || 0 })}
                                    title="Thứ tự"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="hanzi text-base font-semibold">{v.simplified}</span>
                                        <span className="text-xs text-[var(--primary)]">{v.pinyin}</span>
                                        {v.word_type && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">{v.word_type}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">{v.meaning_vi}</p>
                                    {editingNote?.vocabId === v.id ? (
                                        <div className="flex gap-2 mt-2">
                                            <input
                                                type="text"
                                                placeholder="Ghi chú cách dùng trong bài này..."
                                                className="flex-1 px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--surface)]"
                                                value={editingNote.note}
                                                onChange={e => setEditingNote({ vocabId: v.id, note: e.target.value })}
                                                autoFocus
                                            />
                                            <button
                                                onClick={async () => {
                                                    await updateLink(v.id, { noteVi: editingNote.note || null });
                                                    setEditingNote(null);
                                                }}
                                                className="text-xs text-[var(--primary)] hover:underline"
                                            >Lưu</button>
                                            <button
                                                onClick={() => setEditingNote(null)}
                                                className="text-xs text-[var(--text-muted)] hover:underline"
                                            >Hủy</button>
                                        </div>
                                    ) : v.note_vi ? (
                                        <button
                                            onClick={() => setEditingNote({ vocabId: v.id, note: v.note_vi || '' })}
                                            className="text-xs italic text-[var(--text-muted)] hover:text-[var(--primary)] mt-1 block text-left"
                                        >
                                            ✎ {v.note_vi}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setEditingNote({ vocabId: v.id, note: '' })}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] mt-1"
                                        >
                                            + Ghi chú
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => detachVocab(v.id)}
                                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                                    title="Bỏ khỏi bài"
                                >
                                    <Icon name="close" size="sm" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
