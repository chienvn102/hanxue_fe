'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';
import { fetchVocab, Vocabulary, playAudio } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

function VocabList() {
    const searchParams = useSearchParams();
    const hskLevel = searchParams.get('hsk');
    const [vocabs, setVocabs] = useState<Vocabulary[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [savedVocabIds, setSavedVocabIds] = useState<Set<number>>(new Set());
    const { token, isAuthenticated } = useAuth();
    const limit = 20;

    // Debounce search query (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setPage(1); // Reset page when search changes
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch saved vocab IDs
    useEffect(() => {
        if (isAuthenticated && token) {
            fetch(`${API_BASE}/api/notebooks/saved-ids`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        setSavedVocabIds(new Set(data.data));
                    }
                })
                .catch(err => console.error('Failed to fetch saved IDs', err));
        }
    }, [isAuthenticated, token]);

    // Fetch vocab with search query
    useEffect(() => {
        setLoading(true);
        fetchVocab({
            limit,
            page,
            hsk: hskLevel ? parseInt(hskLevel) : undefined,
            q: debouncedQuery.trim() || undefined,
        })
            .then((res) => {
                setVocabs(res.data);
                setTotal(res.pagination.total);
                setTotalPages(res.pagination.totalPages);
            })
            .finally(() => setLoading(false));
    }, [hskLevel, page, debouncedQuery]);

    const handleSaveToggle = (vocabId: number, saved: boolean) => {
        if (saved) {
            setSavedVocabIds(prev => new Set([...prev, vocabId]));
        } else {
            setSavedVocabIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(vocabId);
                return newSet;
            });
        }
    };

    return (
        <>
            {/* Search Bar */}
            <div className="mb-6">
                <Card hover={false} padding="sm" className="flex items-center gap-2">
                    <div className="flex items-center pl-2 text-[var(--text-muted)]">
                        <Icon name="search" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm từ vựng, pinyin, nghĩa..."
                        className="flex-1 px-3 py-2 outline-none bg-transparent text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                        >
                            <Icon name="close" size="sm" />
                        </button>
                    )}
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-main)]">{total}</strong> từ vựng
                    {hskLevel && ` HSK ${hskLevel}`}
                    {debouncedQuery.trim() && ` cho "${debouncedQuery}"`}
                </p>
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                        <Link
                            key={level}
                            href={`/vocab?hsk=${level}`}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${hskLevel === String(level)
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                                }`}
                        >
                            HSK {level}
                        </Link>
                    ))}
                    <Link
                        href="/vocab"
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${!hskLevel
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                            }`}
                    >
                        Tất cả
                    </Link>
                </div>
            </div>

            {/* Vocab Grid */}
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-40 rounded-2xl skeleton"></div>
                    ))}
                </div>
            ) : vocabs.length === 0 ? (
                <div className="text-center py-12">
                    <Icon name="search_off" size="xl" className="text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-secondary)]">
                        {debouncedQuery.trim()
                            ? `Không tìm thấy từ vựng phù hợp với "${debouncedQuery}"`
                            : 'Không có từ vựng nào'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {vocabs.map((vocab, index) => (
                        <VocabCard
                            key={vocab.id}
                            vocab={vocab}
                            index={index}
                            isSavedInitial={savedVocabIds.has(vocab.id)}
                            onSaveToggle={handleSaveToggle}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            <div className="mt-8 flex justify-center items-center gap-4">
                <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    variant="secondary"
                    size="sm"
                >
                    <Icon name="arrow_back" size="sm" />
                    Trước
                </Button>
                <span className="text-sm text-[var(--text-secondary)]">
                    Trang <strong className="text-[var(--text-main)]">{page}</strong> / {totalPages}
                </span>
                <Button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    variant="secondary"
                    size="sm"
                >
                    Sau
                    <Icon name="arrow_forward" size="sm" />
                </Button>
            </div>
        </>
    );
}

function VocabCard({ vocab, index, isSavedInitial = false, onSaveToggle }: {
    vocab: Vocabulary;
    index: number;
    isSavedInitial?: boolean;
    onSaveToggle?: (vocabId: number, saved: boolean) => void;
}) {
    const { token, isAuthenticated } = useAuth();
    const [isSaved, setIsSaved] = useState(isSavedInitial);
    const [saving, setSaving] = useState(false);

    // Sync with parent state when it changes
    useEffect(() => {
        setIsSaved(isSavedInitial);
    }, [isSavedInitial]);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated || !token) return;

        setSaving(true);
        try {
            const method = isSaved ? 'DELETE' : 'POST';
            const res = await fetch(`${API_BASE}/api/vocab/${vocab.id}/save`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const newSavedState = !isSaved;
                setIsSaved(newSavedState);
                onSaveToggle?.(vocab.id, newSavedState);
            }
        } catch (error) {
            console.error('Failed to save vocab', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Link href={`/vocab/${vocab.id}`}>
            <Card
                className="animate-fade-in group h-full"
                style={{ animationDelay: `${index * 0.03}s` }}
            >
                <div className="flex flex-col h-full">
                    {/* Header: HSK Badge + Actions */}
                    <div className="flex justify-between items-start mb-2">
                        {vocab.hskLevel && (
                            <HSKBadge level={vocab.hskLevel as 1 | 2 | 3 | 4 | 5 | 6} />
                        )}
                        <div className="flex items-center gap-1">
                            {/* Save to notebook button */}
                            {isAuthenticated && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isSaved
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--primary)]/20 hover:text-[var(--primary)]'
                                        } ${saving ? 'opacity-50' : ''}`}
                                    title={isSaved ? 'Đã lưu vào sổ tay' : 'Lưu vào sổ tay'}
                                >
                                    <Icon name={isSaved ? 'bookmark' : 'bookmark_border'} size="sm" />
                                </button>
                            )}
                            {/* Audio button */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    playAudio(vocab.simplified);
                                }}
                                className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors cursor-pointer"
                            >
                                <Icon name="volume_up" size="sm" />
                            </button>
                        </div>
                    </div>

                    {/* Character Display */}
                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                        <h3 className="hanzi text-4xl font-normal text-[var(--text-main)] mb-2 group-hover:text-[var(--primary)] transition-colors">
                            {vocab.simplified}
                        </h3>
                        <p className="text-base text-[var(--text-secondary)]">{vocab.pinyin}</p>
                    </div>

                    {/* Meaning */}
                    <div className="pt-3 border-t border-[var(--border)]">
                        <p className="text-sm text-[var(--text-main)] line-clamp-2">
                            {vocab.meaningVi}
                        </p>
                        {vocab.hanViet && (
                            <p className="text-xs text-[var(--text-muted)] italic mt-1">
                                Hán Việt: {vocab.hanViet}
                            </p>
                        )}
                    </div>
                </div>
            </Card>
        </Link>
    );
}

export default function VocabPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
                <div className="flex items-center gap-3 mb-6">
                    <Icon name="menu_book" size="lg" className="text-[var(--primary)]" />
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">Từ Vựng HSK</h1>
                </div>

                <Suspense fallback={
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-40 rounded-2xl skeleton"></div>
                        ))}
                    </div>
                }>
                    <VocabList />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
