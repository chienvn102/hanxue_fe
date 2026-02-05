'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';
import { HSKBadge } from '@/components/ui/Badge';
import { playAudio } from '@/lib/api';

interface SavedVocab {
    notebook_id: number;
    vocabulary_id: number;
    vocab_id?: number;
    simplified: string;
    pinyin: string;
    meaning_vi: string;
    hsk_level: number;
    word_type?: string;
    mastery_level: 'new' | 'learning' | 'mastered';
    added_at: string;
}

interface Notebook {
    id: number;
    name: string;
    color: string;
    is_default: boolean;
    word_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

type FilterType = 'all' | 'new' | 'learning' | 'mastered';

const filterOptions: { id: FilterType; label: string; icon: string }[] = [
    { id: 'all', label: 'Tất cả', icon: 'folder' },
    { id: 'new', label: 'Chưa thuộc', icon: 'fiber_new' },
    { id: 'learning', label: 'Đang học', icon: 'autorenew' },
    { id: 'mastered', label: 'Đã thuộc', icon: 'check_circle' },
];

function SavedVocabCard({ vocab, onRemove }: { vocab: SavedVocab; onRemove: () => void }) {
    const masteryColors = {
        new: 'border-l-sky-500',
        learning: 'border-l-amber-500',
        mastered: 'border-l-emerald-500',
    };

    return (
        <div className={`bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-all group border-l-4 ${masteryColors[vocab.mastery_level]}`}>
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <HSKBadge level={vocab.hsk_level as 1 | 2 | 3 | 4 | 5 | 6} />
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => playAudio(vocab.simplified)}
                            className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors"
                            title="Phát âm"
                        >
                            <Icon name="volume_up" size="sm" />
                        </button>
                        <button
                            onClick={onRemove}
                            className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Xóa khỏi sổ tay"
                        >
                            <Icon name="bookmark_remove" size="sm" />
                        </button>
                    </div>
                </div>

                {/* Character */}
                <Link href={`/vocab/${vocab.vocabulary_id}`} className="block text-center py-4">
                    <h3 className="text-3xl font-medium text-[var(--text-main)] hanzi group-hover:text-[var(--primary)] transition-colors">
                        {vocab.simplified}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{vocab.pinyin}</p>
                </Link>

                {/* Meaning */}
                <div className="pt-3 border-t border-[var(--border)]">
                    <p className="text-sm text-[var(--text-main)] line-clamp-2">{vocab.meaning_vi}</p>
                </div>
            </div>
        </div>
    );
}

export default function NotebookPage() {
    const { token, isAuthenticated } = useAuth();
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [savedVocabs, setSavedVocabs] = useState<SavedVocab[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'hsk'>('newest');

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };

            // Fetch notebooks
            const notebooksRes = await fetch(`${API_BASE}/api/notebooks`, { headers });
            const notebooksData = await notebooksRes.json();
            if (notebooksData.success) {
                setNotebooks(notebooksData.data);

                // Fetch items from default notebook
                const defaultNotebook = notebooksData.data.find((n: Notebook) => n.is_default);
                if (defaultNotebook) {
                    const itemsRes = await fetch(`${API_BASE}/api/notebooks/${defaultNotebook.id}/items`, { headers });
                    const itemsData = await itemsRes.json();
                    if (itemsData.success) {
                        setSavedVocabs(itemsData.data);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load notebook data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveVocab = async (vocabId: number) => {
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/vocab/${vocabId}/save`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setSavedVocabs(prev => prev.filter(v => v.vocabulary_id !== vocabId));
            }
        } catch (error) {
            console.error('Failed to remove vocab', error);
        }
    };

    // Filter and sort vocabs
    const filteredVocabs = savedVocabs
        .filter(v => activeFilter === 'all' || v.mastery_level === activeFilter)
        .filter(v =>
            searchQuery === '' ||
            v.simplified.includes(searchQuery) ||
            v.pinyin.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.meaning_vi.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'hsk') return (a.hsk_level || 0) - (b.hsk_level || 0);
            return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        });

    const stats = {
        total: savedVocabs.length,
        new: savedVocabs.filter(v => v.mastery_level === 'new').length,
        learning: savedVocabs.filter(v => v.mastery_level === 'learning').length,
        mastered: savedVocabs.filter(v => v.mastery_level === 'mastered').length,
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center p-8">
                    <Icon name="lock" size="xl" className="text-[var(--text-muted)] mb-4" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Đăng nhập để xem Sổ tay</h1>
                    <p className="text-[var(--text-secondary)] mb-6">Lưu từ vựng yêu thích và theo dõi tiến độ học tập</p>
                    <Link href="/login">
                        <Button size="lg">
                            <Icon name="login" size="sm" className="mr-2" />
                            Đăng nhập
                        </Button>
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Header */}
                        <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                            <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                                <Icon name="book" className="text-[var(--primary)]" />
                                Sổ tay
                            </h1>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Quản lý từ vựng cá nhân</p>
                        </div>

                        {/* Filter */}
                        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                            {filterOptions.map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => setActiveFilter(option.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${activeFilter === option.id
                                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon name={option.icon} size="sm" />
                                        {option.label}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {option.id === 'all' ? stats.total : stats[option.id]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Create Flashcard Button */}
                        <Link href="/flashcard">
                            <Button fullWidth variant="secondary" className="justify-center">
                                <Icon name="style" size="sm" className="mr-2" />
                                Tạo Flashcard
                            </Button>
                        </Link>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Search & Sort */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size="sm" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm từ vựng, pinyin, nghĩa tiếng Việt..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'newest' | 'hsk')}
                                className="px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] outline-none cursor-pointer"
                            >
                                <option value="newest">Mới nhất</option>
                                <option value="hsk">Theo HSK</option>
                            </select>
                        </div>

                        {/* Vocab Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="h-48 rounded-xl skeleton"></div>
                                ))}
                            </div>
                        ) : filteredVocabs.length === 0 ? (
                            <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                                <Icon name="bookmark_border" size="xl" className="text-[var(--text-muted)] mb-4" />
                                <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
                                    {savedVocabs.length === 0 ? 'Sổ tay trống' : 'Không tìm thấy từ vựng'}
                                </h3>
                                <p className="text-[var(--text-secondary)] mb-4">
                                    {savedVocabs.length === 0
                                        ? 'Nhấn nút + trên từ vựng để lưu vào sổ tay'
                                        : 'Thử tìm kiếm với từ khóa khác'}
                                </p>
                                {savedVocabs.length === 0 && (
                                    <Link href="/vocab">
                                        <Button>
                                            <Icon name="search" size="sm" className="mr-2" />
                                            Khám phá từ vựng
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredVocabs.map((vocab, index) => (
                                    <div
                                        key={`${vocab.notebook_id}-${vocab.vocabulary_id}`}
                                        className="animate-fade-in"
                                        style={{ animationDelay: `${index * 0.03}s` }}
                                    >
                                        <SavedVocabCard
                                            vocab={vocab}
                                            onRemove={() => handleRemoveVocab(vocab.vocabulary_id)}
                                        />
                                    </div>
                                ))}

                                {/* Add new button */}
                                <Link href="/vocab" className="group">
                                    <div className="h-full min-h-[180px] rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                                        <Icon name="add" size="lg" />
                                        <span className="mt-2 text-sm font-medium">Thêm từ mới</span>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
