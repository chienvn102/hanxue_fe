'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';
import { fetchGrammarById, playAudio, type Grammar } from '@/lib/api';

export default function GrammarDetailPage() {
    const params = useParams();
    const [grammar, setGrammar] = useState<Grammar | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            loadGrammar();
        }
    }, [params.id]);

    const loadGrammar = async () => {
        try {
            setLoading(true);
            const data = await fetchGrammarById(Number(params.id));
            setGrammar(data);
        } catch (err) {
            console.error('Failed to fetch grammar:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                </div>
            </div>
        );
    }

    if (!grammar) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <Icon name="error" size="xl" className="text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Không tìm thấy ngữ pháp</h1>
                    <Link href="/grammar" className="mt-4 text-[var(--primary)] hover:underline">
                        Quay lại danh sách ngữ pháp
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                    <Link href="/" className="hover:text-[var(--primary)] transition-colors">Trang chủ</Link>
                    <Icon name="chevron_right" size="xs" />
                    <Link href="/grammar" className="hover:text-[var(--primary)] transition-colors">Ngữ pháp</Link>
                    <Icon name="chevron_right" size="xs" />
                    <span className="text-[var(--text-main)] line-clamp-1">{grammar.grammarPoint}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Card */}
                        <Card hover={false} padding="lg">
                            <div className="flex items-center gap-3 mb-4">
                                <HSKBadge level={grammar.hskLevel as 1|2|3|4|5|6} />
                                {grammar.patternFormula && (
                                    <span className="px-3 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-mono font-medium">
                                        {grammar.patternFormula}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] mb-4">
                                {grammar.grammarPoint}
                            </h1>

                            {/* Pattern display */}
                            {grammar.pattern && grammar.pattern.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {grammar.pattern.map((part, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-main)] text-lg hanzi font-medium"
                                        >
                                            {part}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Explanation */}
                        <Card hover={false} padding="lg">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-6 rounded-full bg-[var(--primary)]"></div>
                                <h2 className="text-lg font-bold text-[var(--text-main)]">Giải thích</h2>
                            </div>
                            <div className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                                {grammar.explanation}
                            </div>
                        </Card>

                        {/* Examples */}
                        {grammar.examples && grammar.examples.length > 0 && (
                            <Card hover={false} padding="lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-6 rounded-full bg-[var(--primary)]"></div>
                                    <h2 className="text-lg font-bold text-[var(--text-main)]">
                                        Ví dụ minh họa ({grammar.examples.length})
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {grammar.examples.map((example, index) => (
                                        <div
                                            key={index}
                                            className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <button
                                                    onClick={() => playAudio(example.chinese)}
                                                    className="mt-1 w-9 h-9 rounded-full bg-[var(--surface)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors shrink-0"
                                                >
                                                    <Icon name="volume_up" size="sm" />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xl text-[var(--text-main)] hanzi mb-1">
                                                        {example.chinese}
                                                    </p>
                                                    <p className="text-sm text-[var(--primary)] mb-1">
                                                        {example.pinyin}
                                                    </p>
                                                    <p className="text-sm text-[var(--text-secondary)] italic">
                                                        {example.vietnamese}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Quick Quiz CTA */}
                        <Card hover={false} padding="md" className="bg-[var(--primary)]/5 border-[var(--primary)]/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="target" size="sm" className="text-[var(--primary)]" />
                                <span className="text-sm font-bold text-[var(--primary)] uppercase tracking-wider">
                                    Kiểm tra nhanh
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
                                Luyện tập ngay!
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Kiểm tra khả năng vận dụng ngữ pháp &ldquo;{grammar.grammarPoint}&rdquo; với bài tập trắc nghiệm ngắn.
                            </p>
                            <Button fullWidth>
                                Bắt đầu Quiz
                            </Button>
                        </Card>

                        {/* Grammar Info Card */}
                        <Card hover={false} padding="md">
                            <h3 className="font-semibold text-[var(--text-main)] mb-3">Thông tin</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Cấp độ</span>
                                    <HSKBadge level={grammar.hskLevel as 1|2|3|4|5|6} />
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Số ví dụ</span>
                                    <span className="font-medium text-[var(--text-main)]">{grammar.examples?.length || 0}</span>
                                </div>
                                {grammar.patternFormula && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">Công thức</span>
                                        <span className="font-mono text-[var(--primary)] text-xs">{grammar.patternFormula}</span>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Back Link */}
                        <Link href="/grammar">
                            <Button variant="secondary" fullWidth>
                                <Icon name="arrow_back" size="sm" />
                                Danh sách ngữ pháp
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
