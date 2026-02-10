'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';
import { fetchGrammarList, type Grammar } from '@/lib/api';

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];

export default function GrammarPage() {
    const [grammars, setGrammars] = useState<Grammar[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [hskFilter, setHskFilter] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const loadGrammars = useCallback(async () => {
        try {
            setLoading(true);
            const result = await fetchGrammarList({
                hsk: hskFilter || undefined,
                q: searchQuery || undefined,
                page,
                limit: 18,
            });
            setGrammars(result.data || []);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotal(result.pagination?.total || 0);
        } catch (err) {
            console.error('Failed to fetch grammar:', err);
        } finally {
            setLoading(false);
        }
    }, [hskFilter, searchQuery, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadGrammars();
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [loadGrammars, searchQuery]);

    const handleHskFilter = (level: number | null) => {
        setHskFilter(level);
        setPage(1);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                            <Icon name="auto_stories" size="md" className="text-[var(--primary)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)]">Ngữ pháp</h1>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {total > 0 ? `${total} mẫu ngữ pháp` : 'Tra cứu ngữ pháp tiếng Trung'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Icon name="search" size="sm" className="text-[var(--text-muted)]" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        placeholder="Tìm kiếm ngữ pháp, công thức..."
                        className="input pl-11 pr-10 w-full"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); setPage(1); }}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                            <Icon name="close" size="sm" />
                        </button>
                    )}
                </div>

                {/* HSK Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => handleHskFilter(null)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            !hskFilter
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/50'
                        }`}
                    >
                        Tất cả
                    </button>
                    {HSK_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => handleHskFilter(level)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                hskFilter === level
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/50'
                            }`}
                        >
                            HSK {level}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 animate-pulse">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-12 h-6 rounded-full skeleton" />
                                    <div className="w-32 h-4 rounded skeleton" />
                                </div>
                                <div className="w-full h-5 rounded skeleton mb-2" />
                                <div className="w-3/4 h-4 rounded skeleton mb-4" />
                                <div className="w-1/2 h-3 rounded skeleton" />
                            </div>
                        ))}
                    </div>
                ) : grammars.length === 0 ? (
                    <div className="text-center py-16">
                        <Icon name="auto_stories" size="xl" className="text-[var(--text-muted)] mb-4" />
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
                            Không tìm thấy ngữ pháp
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                            {searchQuery ? 'Thử từ khóa khác' : 'Chưa có dữ liệu ngữ pháp'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grammars.map((grammar, index) => (
                            <Link
                                key={grammar.id}
                                href={`/grammar/${grammar.id}`}
                                className="animate-fade-in"
                                style={{ animationDelay: `${index * 0.03}s` }}
                            >
                                <Card hover padding="md" className="h-full flex flex-col">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <HSKBadge level={grammar.hskLevel as 1|2|3|4|5|6} />
                                        {grammar.examples?.length > 0 && (
                                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                <Icon name="format_list_bulleted" size="xs" />
                                                {grammar.examples.length} ví dụ
                                            </span>
                                        )}
                                    </div>

                                    {/* Grammar Point */}
                                    <h3 className="text-base font-bold text-[var(--text-main)] mb-1 line-clamp-1">
                                        {grammar.grammarPoint}
                                    </h3>

                                    {/* Pattern Formula */}
                                    {grammar.patternFormula && (
                                        <p className="text-sm text-[var(--primary)] font-mono mb-2">
                                            {grammar.patternFormula}
                                        </p>
                                    )}

                                    {/* Explanation */}
                                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 flex-1">
                                        {grammar.explanation}
                                    </p>

                                    {/* Example preview */}
                                    {grammar.examples?.[0] && (
                                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                            <p className="text-sm text-[var(--text-main)] hanzi line-clamp-1">
                                                {grammar.examples[0].chinese}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                                                {grammar.examples[0].vietnamese}
                                            </p>
                                        </div>
                                    )}
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <Icon name="chevron_left" size="sm" />
                            Trước
                        </Button>
                        <span className="text-sm text-[var(--text-secondary)]">
                            Trang {page} / {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Sau
                            <Icon name="chevron_right" size="sm" />
                        </Button>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
