'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import CharacterSidebar from '@/components/CharacterSidebar';
import { fetchVocabById, fetchCharacterBreakdown, Vocabulary, Character, playAudio } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

export default function VocabDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [vocab, setVocab] = useState<Vocabulary | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'meaning' | 'examples' | 'grammar'>('meaning');

    // Examples state - now includes pinyin
    const [examples, setExamples] = useState<Array<{ zh: string, pinyin?: string, vi: string }>>([]);
    const [examplesLoading, setExamplesLoading] = useState(false);
    const [examplesSource, setExamplesSource] = useState<'database' | 'ai' | 'none' | null>(null);

    useEffect(() => {
        const id = parseInt(resolvedParams.id);
        if (isNaN(id)) {
            setError('ID không hợp lệ');
            setLoading(false);
            return;
        }

        fetchVocabById(id)
            .then((vocabData) => {
                setVocab(vocabData);
                // If vocab has examples from DB, set them
                if (vocabData.examples && vocabData.examples.length > 0) {
                    setExamples(vocabData.examples);
                    setExamplesSource('database');
                }
                return fetchCharacterBreakdown(vocabData.simplified);
            })
            .then((breakdown) => {
                setCharacters(breakdown.characters);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [resolvedParams.id]);

    // Fetch examples when clicking examples tab (if not already loaded)
    const loadExamples = async () => {
        if (examplesLoading || examples.length > 0) return;

        setExamplesLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/vocab/${resolvedParams.id}/examples`);
            const data = await res.json();
            if (data.examples && data.examples.length > 0) {
                setExamples(data.examples);
                setExamplesSource(data.source);
            }
        } catch (err) {
            console.error('Failed to load examples:', err);
        } finally {
            setExamplesLoading(false);
        }
    };

    // Load examples when tab is clicked
    useEffect(() => {
        if (activeTab === 'examples' && examples.length === 0 && !examplesLoading) {
            loadExamples();
        }
    }, [activeTab]);

    if (loading) {
        return (
            <div className="min-h-screen" style={{ background: 'var(--background)' }}>
                <Header />
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="card">
                                <div className="skeleton h-12 w-32 mb-4"></div>
                                <div className="skeleton h-6 w-48 mb-2"></div>
                                <div className="skeleton h-4 w-full mb-2"></div>
                                <div className="skeleton h-4 w-3/4"></div>
                            </div>
                        </div>
                        <div className="skeleton h-64 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !vocab) {
        return (
            <div className="min-h-screen" style={{ background: 'var(--background)' }}>
                <Header />
                <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <p className="text-xl" style={{ color: 'var(--accent)' }}>{error || 'Không tìm thấy từ vựng'}</p>
                    <Link href="/vocab" className="btn-primary mt-6 inline-block">
                        ← Quay lại danh sách
                    </Link>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'meaning', label: '📖 Câu', icon: '📖' },
        { id: 'examples', label: '💬 Ví dụ', icon: '💬' },
        { id: 'grammar', label: '📚 Ngữ pháp', icon: '📚' },
    ];

    return (
        <div className="min-h-screen" style={{ background: 'var(--background)' }}>
            <Header />

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <Link href="/" className="hover:text-primary">Trang chủ</Link>
                    <span className="mx-2">/</span>
                    <Link href="/vocab" className="hover:text-primary">Từ vựng</Link>
                    <span className="mx-2">/</span>
                    <span style={{ color: 'var(--foreground)' }}>{vocab.simplified}</span>
                </nav>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Word Header Card */}
                        <div className="card animate-fade-in">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <h1 className="hanzi hanzi-xl">{vocab.simplified}</h1>
                                        {vocab.traditional && vocab.traditional !== vocab.simplified && (
                                            <span className="text-3xl" style={{ color: 'var(--text-muted)' }}>
                                                ({vocab.traditional})
                                            </span>
                                        )}
                                        {vocab.hskLevel && (
                                            <span className={`hsk-badge hsk-${vocab.hskLevel} text-base px-4 py-1`}>
                                                HSK {vocab.hskLevel}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-lg">
                                        <span className="pinyin">{vocab.pinyin}</span>
                                    </div>

                                    {vocab.themes && vocab.themes.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {vocab.themes.map((t) => (
                                                <Link
                                                    key={t.slug}
                                                    href={`/vocab?theme=${t.slug}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                                                    title={t.name_en || t.name_vi}
                                                >
                                                    {t.name_vi}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => playAudio(vocab.simplified, vocab.audioUrl)}
                                        className="btn-audio animate-pulse-glow"
                                        title="Nghe phát âm"
                                    >
                                        🔊
                                    </button>
                                    <button className="btn-secondary px-3 py-2" title="Thêm vào sổ tay">
                                        ➕
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`search-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="card animate-fade-in">
                            {activeTab === 'meaning' && (
                                <div>
                                    <h2 className="text-sm font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                                        Nghĩa tiếng Việt
                                    </h2>
                                    <p className="text-xl" style={{ color: 'var(--foreground)' }}>
                                        {vocab.meaningVi}
                                    </p>

                                    {vocab.meaningEn && (
                                        <div className="mt-6">
                                            <h2 className="text-sm font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                                                English
                                            </h2>
                                            <p style={{ color: 'var(--text-muted)' }}>{vocab.meaningEn}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'examples' && (
                                <div>
                                    {examplesLoading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                Đang tạo ví dụ với AI...
                                            </span>
                                        </div>
                                    ) : examples.length > 0 ? (
                                        <div className="space-y-4">
                                            {examplesSource === 'ai' && (
                                                <div className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded inline-block mb-2">
                                                    ✨ Được tạo bởi AI
                                                </div>
                                            )}
                                            {examples.map((ex, i) => (
                                                <div key={i} className="border-l-4 pl-4" style={{ borderColor: 'var(--accent)' }}>
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-1">
                                                            <p className="hanzi text-lg">{ex.zh}</p>
                                                            {ex.pinyin && (
                                                                <p className="pinyin text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                                    {ex.pinyin}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => playAudio(ex.zh)}
                                                            className="text-[var(--primary)] hover:scale-110 transition-transform p-1"
                                                            title="Nghe mẫu câu"
                                                        >
                                                            🔊
                                                        </button>
                                                    </div>
                                                    <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{ex.vi}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)' }}>Chưa có ví dụ cho từ này</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'grammar' && (
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>
                                        Tính năng ngữ pháp đang được phát triển...
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Word Type */}
                        {vocab.wordType && (
                            <div className="card">
                                <div className="flex gap-4">
                                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loại từ:</span>
                                    <span className="text-sm font-medium">{vocab.wordType}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Character Breakdown */}
                    <div className="lg:col-span-1">
                        <CharacterSidebar characters={characters} mainWord={vocab.simplified} />
                    </div>
                </div>
            </main>
        </div>
    );
}
