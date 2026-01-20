'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { HSKBadge } from '@/components/ui/Badge';
import { searchVocab, Vocabulary, playAudio } from '@/lib/api';

function SearchInput() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

    const handleSearch = () => {
        if (searchInput.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
        }
    };

    return (
        <div className="py-6 bg-[var(--surface-secondary)]">
            <div className="max-w-4xl mx-auto px-4">
                <Card hover={false} padding="sm" className="flex items-center gap-2">
                    <div className="flex items-center pl-2 text-[var(--text-muted)]">
                        <Icon name="search" />
                    </div>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Tìm kiếm từ vựng..."
                        className="flex-1 px-3 py-2 outline-none bg-transparent text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                    />
                    <button
                        onClick={handleSearch}
                        className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                        <Icon name="search" size="sm" />
                        Tìm
                    </button>
                </Card>
            </div>
        </div>
    );
}

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState<Vocabulary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (query) {
            setLoading(true);
            setError('');
            searchVocab(query)
                .then(setResults)
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [query]);

    if (!query) {
        return (
            <div className="text-center py-16">
                <Icon name="search" size="xl" className="text-[var(--primary)]/30 mb-4" />
                <p className="text-[var(--text-muted)]">Nhập từ khóa để tìm kiếm</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <Card key={i} hover={false}>
                        <div className="flex items-start gap-4">
                            <div className="skeleton h-12 w-20"></div>
                            <div className="flex-1">
                                <div className="skeleton h-4 w-32 mb-2"></div>
                                <div className="skeleton h-4 w-full"></div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <Icon name="error" size="xl" className="text-red-500 mb-4" />
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="text-center py-16">
                <Icon name="sentiment_dissatisfied" size="xl" className="text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-muted)]">Không tìm thấy kết quả cho "{query}"</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm mb-6 text-[var(--text-secondary)]">
                Tìm thấy <strong>{results.length}</strong> kết quả cho "{query}"
            </p>
            {results.map((vocab, index) => (
                <VocabResult key={vocab.id} vocab={vocab} index={index} />
            ))}
        </div>
    );
}

function VocabResult({ vocab, index }: { vocab: Vocabulary; index: number }) {
    return (
        <Link href={`/vocab/${vocab.id}`}>
            <Card className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                            <span className="hanzi text-3xl font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                                {vocab.simplified}
                            </span>
                            {vocab.traditional && vocab.traditional !== vocab.simplified && (
                                <span className="text-xl text-[var(--text-muted)]">
                                    ({vocab.traditional})
                                </span>
                            )}
                            {vocab.hskLevel && (
                                <HSKBadge level={vocab.hskLevel as 1 | 2 | 3 | 4 | 5 | 6} />
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-3">
                            <span className="text-[var(--text-secondary)]">{vocab.pinyin}</span>
                            {vocab.hanViet && (
                                <span className="text-[var(--primary)] italic">{vocab.hanViet}</span>
                            )}
                        </div>
                        <p className="text-[var(--text-main)]">{vocab.meaningVi}</p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            playAudio(vocab.simplified);
                        }}
                        className="ml-4 w-12 h-12 rounded-full bg-[var(--surface-secondary)] text-[var(--primary)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors cursor-pointer border border-[var(--border)]"
                        title="Nghe phát âm"
                    >
                        <Icon name="volume_up" />
                    </button>
                </div>
            </Card>
        </Link>
    );
}

function SearchPageContent() {
    return (
        <>
            <SearchInput />
            <main className="max-w-4xl mx-auto px-4 py-8">
                <SearchResults />
            </main>
        </>
    );
}

export default function SearchPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full"></div>
                </div>
            }>
                <SearchPageContent />
            </Suspense>
            <Footer />
        </div>
    );
}
