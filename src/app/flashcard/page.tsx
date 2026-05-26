'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
    createFlashcardDeck,
    fetchFlashcardDecks,
    fetchNotebooks,
    fetchVocabThemes,
    type FlashcardDeck,
    type VocabTheme,
} from '@/lib/api';

type SourceType = FlashcardDeck['source_type'];

interface NotebookOption {
    id: number;
    name: string;
    word_count?: number;
    is_default?: boolean;
}

const SOURCE_LABELS: Record<SourceType, string> = {
    hsk: 'Theo HSK level',
    notebook: 'Từ đã lưu (Notebook)',
    theme: 'Theo chủ đề',
    lesson: 'Theo bài học',
    manual: 'Tự chọn từ',
};

const SOURCE_ICONS: Record<SourceType, string> = {
    hsk: 'school',
    notebook: 'bookmark',
    theme: 'category',
    lesson: 'menu_book',
    manual: 'edit_note',
};

export default function FlashcardPage() {
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [sourceType, setSourceType] = useState<SourceType>('hsk');
    const [sourceRef, setSourceRef] = useState('1');

    // Options data
    const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
    const [themes, setThemes] = useState<VocabTheme[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            setDecks(await fetchFlashcardDecks());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load().catch(console.error);
    }, []);

    // Lazy load options khi mở modal
    useEffect(() => {
        if (!showModal) return;
        fetchNotebooks()
            .then(res => setNotebooks((res.data || []) as NotebookOption[]))
            .catch(err => console.error('Load notebooks failed:', err));
        fetchVocabThemes()
            .then(setThemes)
            .catch(err => console.error('Load themes failed:', err));
    }, [showModal]);

    const openModal = (type: SourceType = 'hsk') => {
        setSourceType(type);
        setSourceRef(type === 'hsk' ? '1' : '');
        setName('');
        setError(null);
        setShowModal(true);
    };

    const changeSourceType = (t: SourceType) => {
        setSourceType(t);
        setSourceRef(t === 'hsk' ? '1' : '');
    };

    const submit = async () => {
        if (!name.trim()) { setError('Vui lòng đặt tên bộ flashcard.'); return; }
        if (!sourceRef && sourceType !== 'manual') { setError('Vui lòng chọn nguồn từ vựng.'); return; }
        setCreating(true);
        setError(null);
        try {
            await createFlashcardDeck({
                name: name.trim(),
                source_type: sourceType,
                source_ref: sourceRef || undefined,
            });
            setShowModal(false);
            await load();
        } catch (e) {
            setError((e as Error).message || 'Không tạo được bộ flashcard.');
        } finally {
            setCreating(false);
        }
    };

    // Auto-suggest name khi đổi source
    useEffect(() => {
        if (!showModal) return;
        if (name && name !== '') return; // không overwrite tên user đã gõ
        let suggested = '';
        if (sourceType === 'hsk' && sourceRef) suggested = `HSK ${sourceRef}`;
        else if (sourceType === 'notebook' && sourceRef) {
            const nb = notebooks.find(n => String(n.id) === sourceRef);
            suggested = nb ? `Sổ: ${nb.name}` : '';
        }
        else if (sourceType === 'theme' && sourceRef) {
            const t = themes.find(th => th.slug === sourceRef);
            suggested = t ? `Chủ đề: ${t.name_vi}` : '';
        }
        if (suggested) setName(suggested);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceType, sourceRef, notebooks, themes]);

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Header />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">Flashcard</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Tạo bộ từ riêng theo HSK, notebook, chủ đề hoặc bài học.
                        </p>
                    </div>
                    <Button onClick={() => openModal('hsk')}>
                        <Icon name="add" size="sm" className="mr-2" />
                        Tạo bộ mới
                    </Button>
                </div>

                {loading ? (
                    <div className="py-16 flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
                    </div>
                ) : decks.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                        <Icon name="style" size="lg" className="text-[var(--text-muted)] mb-3" />
                        <p className="text-[var(--text-secondary)] mb-4">
                            Chưa có bộ flashcard. Tạo bộ đầu tiên!
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto">
                            {(['hsk', 'notebook', 'theme', 'lesson'] as SourceType[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => openModal(t)}
                                    className="p-3 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                                >
                                    <Icon name={SOURCE_ICONS[t]} size="md" className="text-[var(--primary)] mb-2" />
                                    <div className="text-sm font-medium">{SOURCE_LABELS[t]}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {decks.map(deck => (
                            <div
                                key={deck.id}
                                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)]/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="font-semibold text-[var(--text-main)] truncate">{deck.name}</h2>
                                        <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                            <Icon name={SOURCE_ICONS[deck.source_type]} size="xs" />
                                            {SOURCE_LABELS[deck.source_type]}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-[var(--primary)] shrink-0">
                                        {deck.card_count} từ
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/flashcard/session?deck=${deck.id}&mode=choice`}
                                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] inline-flex items-center justify-center gap-1.5"
                                    >
                                        <Icon name="play_arrow" size="sm" /> Học
                                    </Link>
                                    <Link
                                        href={`/flashcard/${deck.id}/manage`}
                                        className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] text-sm inline-flex items-center gap-1.5"
                                        title="Sửa nội dung, thêm/xoá thẻ"
                                    >
                                        <Icon name="edit" size="sm" /> Quản lý
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--surface)] rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-[var(--text-main)]">Tạo bộ flashcard mới</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            >
                                <Icon name="close" />
                            </button>
                        </div>

                        {/* Source type picker */}
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nguồn từ vựng</label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {(['hsk', 'notebook', 'theme', 'lesson'] as SourceType[]).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => changeSourceType(t)}
                                    className={`p-3 rounded-lg border-2 text-sm flex items-center gap-2 transition-colors ${
                                        sourceType === t
                                            ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                                            : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                                    }`}
                                >
                                    <Icon name={SOURCE_ICONS[t]} size="sm" />
                                    <span className="text-left">{SOURCE_LABELS[t]}</span>
                                </button>
                            ))}
                        </div>

                        {/* Source ref selector — dynamic */}
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Chọn nguồn</label>
                        {sourceType === 'hsk' && (
                            <select
                                value={sourceRef}
                                onChange={e => setSourceRef(e.target.value)}
                                className="w-full px-3 py-2 mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => (
                                    <option key={n} value={n}>HSK {n}</option>
                                ))}
                            </select>
                        )}
                        {sourceType === 'notebook' && (
                            <select
                                value={sourceRef}
                                onChange={e => setSourceRef(e.target.value)}
                                className="w-full px-3 py-2 mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                            >
                                <option value="">— Chọn sổ —</option>
                                {notebooks.map(nb => (
                                    <option key={nb.id} value={nb.id}>
                                        {nb.name}{nb.word_count ? ` (${nb.word_count} từ)` : ''}
                                        {nb.is_default ? ' • mặc định' : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        {sourceType === 'theme' && (
                            <select
                                value={sourceRef}
                                onChange={e => setSourceRef(e.target.value)}
                                className="w-full px-3 py-2 mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                            >
                                <option value="">— Chọn chủ đề —</option>
                                {themes.map(t => (
                                    <option key={t.slug} value={t.slug}>
                                        {t.icon ? `${t.icon} ` : ''}{t.name_vi}
                                    </option>
                                ))}
                            </select>
                        )}
                        {sourceType === 'lesson' && (
                            <input
                                type="number"
                                value={sourceRef}
                                onChange={e => setSourceRef(e.target.value)}
                                placeholder="Nhập lesson ID (sẽ thay bằng picker sau)"
                                className="w-full px-3 py-2 mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                            />
                        )}

                        {/* Name */}
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tên bộ</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Vd: Từ vựng HSK 2 tuần này"
                            className="w-full px-3 py-2 mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]"
                        />

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                                disabled={creating}
                            >
                                Hủy
                            </button>
                            <Button
                                onClick={submit}
                                disabled={creating}
                                className="flex-1"
                            >
                                {creating ? 'Đang tạo...' : 'Tạo bộ'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
