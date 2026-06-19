'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
    addFlashcardDeckItem,
    deleteFlashcardDeck,
    fetchFlashcardDeckItems,
    fetchFlashcardDecks,
    removeFlashcardDeckItem,
    searchVocab,
    updateFlashcardDeck,
    type FlashcardDeck,
    type FlashcardDeckItem,
    type Vocabulary,
} from '@/lib/api';

const PAGE_SIZE = 30;

/**
 * Quản lý 1 bộ flashcard:
 *   - Sửa tên + mô tả deck
 *   - Liệt kê thẻ (phân trang)
 *   - Thêm thẻ bằng search vocab
 *   - Xoá thẻ khỏi deck
 *   - Xoá cả deck
 *
 * Đường dẫn: /flashcard/[deckId]/manage
 */
export default function FlashcardDeckManagePage() {
    const params = useParams();
    const router = useRouter();
    const deckId = Number(params.deckId);

    const [deck, setDeck] = useState<FlashcardDeck | null>(null);
    const [items, setItems] = useState<FlashcardDeckItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit deck form
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [savingMeta, setSavingMeta] = useState(false);

    // Add item search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Vocabulary[]>([]);
    const [searching, setSearching] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);

    const existingIds = useMemo(() => new Set(items.map(i => i.id)), [items]);

    // Phân trang client-side danh sách thẻ.
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [deckId]);
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const pageSafe = Math.min(page, totalPages);
    const pagedItems = items.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [allDecks, itemRows] = await Promise.all([
                fetchFlashcardDecks(),
                fetchFlashcardDeckItems(deckId),
            ]);
            const cur = allDecks.find(d => d.id === deckId) || null;
            setDeck(cur);
            setItems(itemRows);
            if (cur) {
                setEditName(cur.name);
                setEditDesc(cur.description || '');
            }
        } catch (e) {
            setError((e as Error).message || 'Không tải được dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [deckId]);

    useEffect(() => {
        if (Number.isFinite(deckId)) load();
    }, [deckId, load]);

    // Debounced search
    useEffect(() => {
        const q = searchQuery.trim();
        if (q.length < 1) { setSearchResults([]); return; }
        let cancelled = false;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const results = await searchVocab(q);
                if (!cancelled) setSearchResults(results.slice(0, 20));
            } catch {
                if (!cancelled) setSearchResults([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [searchQuery]);

    const saveMeta = async () => {
        if (!editName.trim()) { setError('Tên bộ thẻ không được rỗng'); return; }
        setSavingMeta(true);
        setError(null);
        try {
            await updateFlashcardDeck(deckId, { name: editName.trim(), description: editDesc.trim() || null });
            setEditing(false);
            await load();
        } catch (e) {
            setError((e as Error).message || 'Không lưu được');
        } finally {
            setSavingMeta(false);
        }
    };

    const handleAdd = async (vocabId: number) => {
        setAddingId(vocabId);
        try {
            await addFlashcardDeckItem(deckId, vocabId);
            await load();
        } catch (e) {
            setError((e as Error).message || 'Không thêm được thẻ');
        } finally {
            setAddingId(null);
        }
    };

    const handleRemove = async (vocabId: number) => {
        if (!confirm('Xoá thẻ này khỏi bộ?')) return;
        try {
            await removeFlashcardDeckItem(deckId, vocabId);
            setItems(prev => prev.filter(i => i.id !== vocabId));
        } catch (e) {
            setError((e as Error).message || 'Không xoá được thẻ');
        }
    };

    const handleDeleteDeck = async () => {
        if (!confirm(`Xoá hoàn toàn bộ "${deck?.name}"? Tất cả ${items.length} thẻ sẽ bị xoá theo.`)) return;
        try {
            await deleteFlashcardDeck(deckId);
            router.push('/flashcard');
        } catch (e) {
            setError((e as Error).message || 'Không xoá được bộ');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)]">
                <Header />
                <main className="max-w-5xl mx-auto px-4 py-8">
                    <div className="py-16 flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
                    </div>
                </main>
            </div>
        );
    }

    if (!deck) {
        return (
            <div className="min-h-screen bg-[var(--background)]">
                <Header />
                <main className="max-w-5xl mx-auto px-4 py-8 text-center">
                    <Icon name="error" size="xl" className="text-red-500 mb-3" />
                    <p className="text-[var(--text-secondary)] mb-4">Không tìm thấy bộ flashcard</p>
                    <Link href="/flashcard" className="text-[var(--primary)] hover:underline">Quay lại danh sách</Link>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Header />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <Link href="/flashcard" className="hover:text-[var(--primary)]">Flashcard</Link>
                    <Icon name="chevron_right" size="xs" />
                    <span className="text-[var(--text-main)]">{deck.name}</span>
                </nav>

                {/* Deck header */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    {editing ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Tên bộ</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                            />
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Mô tả</label>
                            <textarea
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                            />
                            <div className="flex gap-2">
                                <Button onClick={saveMeta} disabled={savingMeta}>
                                    {savingMeta ? 'Đang lưu...' : 'Lưu'}
                                </Button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setEditName(deck.name);
                                        setEditDesc(deck.description || '');
                                    }}
                                    className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
                                >
                                    Huỷ
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl font-bold text-[var(--text-main)]">{deck.name}</h1>
                                {deck.description && (
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">{deck.description}</p>
                                )}
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    {items.length} thẻ · Nguồn: {deck.source_type}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/flashcard/session?deck=${deck.id}&mode=choice`}
                                    className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] inline-flex items-center gap-1.5"
                                >
                                    <Icon name="play_arrow" size="sm" /> Học
                                </Link>
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] text-sm inline-flex items-center gap-1.5"
                                >
                                    <Icon name="edit" size="sm" /> Sửa
                                </button>
                                <button
                                    onClick={handleDeleteDeck}
                                    className="px-3 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm inline-flex items-center gap-1.5"
                                >
                                    <Icon name="delete" size="sm" /> Xoá bộ
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                        {error}
                    </div>
                )}

                {/* Add new card by search */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <h2 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                        <Icon name="add" size="sm" /> Thêm thẻ mới
                    </h2>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Tìm từ vựng (chữ Hán, pinyin, nghĩa Việt)..."
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] mb-3"
                    />
                    {searching && <p className="text-xs text-[var(--text-muted)]">Đang tìm...</p>}
                    {!searching && searchQuery && searchResults.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)]">Không tìm thấy từ phù hợp</p>
                    )}
                    {searchResults.length > 0 && (
                        <ul className="space-y-1 max-h-72 overflow-y-auto">
                            {searchResults.map(v => {
                                const inDeck = existingIds.has(v.id);
                                return (
                                    <li
                                        key={v.id}
                                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-secondary)]"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-semibold hanzi text-[var(--text-main)]">{v.simplified}</span>
                                                <span className="text-xs text-[var(--text-muted)]">{v.pinyin}</span>
                                                {v.hskLevel && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)]">HSK {v.hskLevel}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">{v.meaningVi}</p>
                                        </div>
                                        {inDeck ? (
                                            <span className="text-xs text-emerald-500 flex items-center gap-1">
                                                <Icon name="check" size="xs" /> Đã có
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleAdd(v.id)}
                                                disabled={addingId === v.id}
                                                className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 disabled:opacity-50 inline-flex items-center gap-1"
                                            >
                                                <Icon name="add" size="xs" />
                                                {addingId === v.id ? '...' : 'Thêm'}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Items list */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-[var(--text-main)]">
                            Thẻ trong bộ ({items.length})
                        </h2>
                        {totalPages > 1 && (
                            <span className="text-xs text-[var(--text-muted)]">Trang {pageSafe}/{totalPages}</span>
                        )}
                    </div>
                    {items.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] py-6 text-center">
                            Bộ này chưa có thẻ nào. Dùng ô tìm kiếm phía trên để thêm.
                        </p>
                    ) : (
                        <>
                            <ul className="divide-y divide-[var(--border)]">
                                {pagedItems.map(item => (
                                    <li key={item.id} className="py-3 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xl font-semibold hanzi text-[var(--text-main)]">{item.simplified}</span>
                                                <span className="text-sm text-[var(--text-muted)]">{item.pinyin}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)]">HSK {item.hskLevel}</span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{item.meaningVi}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(item.id)}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
                                            title="Xoá khỏi bộ"
                                        >
                                            <Icon name="delete" size="sm" />
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-[var(--border)]">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={pageSafe <= 1}
                                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                    >
                                        <Icon name="chevron_left" size="sm" /> Trước
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(n => n === 1 || n === totalPages || Math.abs(n - pageSafe) <= 1)
                                        .reduce<number[]>((acc, n) => {
                                            if (acc.length && n - acc[acc.length - 1] > 1) acc.push(-1);
                                            acc.push(n);
                                            return acc;
                                        }, [])
                                        .map((n, idx) => n === -1
                                            ? <span key={`gap-${idx}`} className="px-1 text-[var(--text-muted)]">…</span>
                                            : (
                                                <button
                                                    key={n}
                                                    onClick={() => setPage(n)}
                                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                                        n === pageSafe
                                                            ? 'bg-[var(--primary)] text-white'
                                                            : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                                                    }`}
                                                >
                                                    {n}
                                                </button>
                                            )
                                        )}
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={pageSafe >= totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                    >
                                        Sau <Icon name="chevron_right" size="sm" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
