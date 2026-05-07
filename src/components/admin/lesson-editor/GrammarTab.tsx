'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { TextbookGrammar } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GrammarSearchResult {
    id: number;
    grammar_point: string;
    explanation: string | null;
    pattern_formula: string | null;
    hsk_level: number | null;
}

interface Props {
    lessonId: number;
    items: TextbookGrammar[];
    token: string | null;
    onChanged: () => Promise<void>;
}

export function GrammarTab({ lessonId, items, token, onChanged }: Props) {
    const [search, setSearch] = useState('');
    const [hskFilter, setHskFilter] = useState<number | ''>('');
    const [results, setResults] = useState<GrammarSearchResult[]>([]);
    const [searching, setSearching] = useState(false);

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
                const res = await fetch(`${API_BASE}/api/grammar?${params}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const data = await res.json();
                if (data.success) {
                    const attached = new Set(items.map(i => i.id));
                    setResults((data.data || []).filter((g: GrammarSearchResult) => !attached.has(g.id)));
                }
            } finally {
                setSearching(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [search, hskFilter, items, token]);

    const attach = async (grammarId: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/grammar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    grammarPatternId: grammarId,
                    orderIndex: items.length === 0 ? 0 : Math.max(...items.map(i => i.order_index)) + 1,
                }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                alert(`Lỗi: ${d.message || 'Không thể thêm điểm ngữ pháp'}`);
                return;
            }
            await onChanged();
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối');
        }
    };

    const detach = async (grammarId: number) => {
        if (!confirm('Bỏ điểm ngữ pháp này khỏi bài?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/grammar/${grammarId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) await onChanged();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-3">Thêm điểm ngữ pháp vào bài</h3>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        placeholder="Tìm điểm ngữ pháp..."
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
                        {results.map(g => (
                            <div key={g.id} className="flex items-center gap-3 p-2 rounded hover:bg-[var(--surface-secondary)]">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[var(--text-main)]">{g.grammar_point}</span>
                                        {g.hsk_level && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">HSK {g.hsk_level}</span>
                                        )}
                                    </div>
                                    {g.pattern_formula && (
                                        <p className="text-xs hanzi text-[var(--text-secondary)] mt-0.5">{g.pattern_formula}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => attach(g.id)}
                                    className="p-1.5 rounded text-[var(--primary)] hover:bg-[var(--primary)]/10"
                                    title="Thêm"
                                >
                                    <Icon name="add" size="sm" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-3">
                    Điểm ngữ pháp đã thêm ({items.length})
                </h3>
                {items.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)] text-sm">
                        Chưa có điểm ngữ pháp nào.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {[...items].sort((a, b) => a.order_index - b.order_index).map(g => (
                            <div key={g.id} className="flex items-start gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                <span className="w-7 h-7 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] shrink-0">
                                    {g.order_index}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-[var(--text-main)]">{g.grammar_point}</h4>
                                    {g.pattern_formula && (
                                        <p className="text-xs hanzi text-[var(--text-secondary)] mt-0.5">{g.pattern_formula}</p>
                                    )}
                                    {g.explanation && (
                                        <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{g.explanation}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => detach(g.id)}
                                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 shrink-0"
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
