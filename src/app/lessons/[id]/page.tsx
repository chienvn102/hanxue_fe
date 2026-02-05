'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';
import { HSKBadge } from '@/components/ui/Badge';
import { playAudio } from '@/lib/api';

interface VocabContent {
    id: number;
    simplified: string;
    pinyin: string;
    meaning_vi: string;
    timestamp?: number;
}

interface GrammarContent {
    id: number;
    pattern: string;
    explanation: string;
    examples: { zh: string; vi: string }[];
}

interface Lesson {
    id: number;
    title: string;
    description?: string;
    youtube_id: string;
    duration: number;
    course_id: number;
    order_index: number;
}

interface LessonContent {
    vocabulary: VocabContent[];
    grammar: GrammarContent[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

type TabType = 'content' | 'vocab' | 'grammar' | 'quiz';

function YouTubePlayer({ videoId, onTimeUpdate }: { videoId: string; onTimeUpdate?: (time: number) => void }) {
    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                title="Video bài giảng"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
            />
        </div>
    );
}

function VocabItem({ vocab, onSave, isSaved }: { vocab: VocabContent; onSave?: () => void; isSaved?: boolean }) {
    return (
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all group">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => playAudio(vocab.simplified)}
                        className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors"
                    >
                        <Icon name="volume_up" size="sm" />
                    </button>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-medium text-[var(--text-main)] hanzi">{vocab.simplified}</span>
                            <span className="text-sm text-[var(--text-secondary)]">({vocab.pinyin})</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{vocab.meaning_vi}</p>
                    </div>
                </div>
                <button
                    onClick={onSave}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSaved
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--primary)]/20 hover:text-[var(--primary)]'
                        }`}
                    title={isSaved ? 'Đã lưu vào sổ tay' : 'Lưu vào sổ tay'}
                >
                    <Icon name={isSaved ? 'check' : 'add'} size="sm" />
                </button>
            </div>
        </div>
    );
}

export default function LessonPlayerPage() {
    const params = useParams();
    const { token } = useAuth();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [content, setContent] = useState<LessonContent>({ vocabulary: [], grammar: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('vocab');
    const [savedVocabIds, setSavedVocabIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (params.id) {
            fetchLesson();
        }
    }, [params.id, token]);

    const fetchLesson = async () => {
        try {
            setLoading(true);
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/lessons/${params.id}`, { headers });
            const data = await res.json();

            if (data.success) {
                setLesson(data.data.lesson);
                setContent({
                    vocabulary: data.data.vocabulary || [],
                    grammar: data.data.grammar || []
                });
            }
        } catch (error) {
            console.error('Failed to load lesson', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveVocab = (vocabId: number) => {
        // TODO: Call API to save to notebook
        setSavedVocabIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(vocabId)) {
                newSet.delete(vocabId);
            } else {
                newSet.add(vocabId);
            }
            return newSet;
        });
    };

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: 'vocab', label: 'Từ vựng', icon: 'translate' },
        { id: 'grammar', label: 'Ngữ pháp', icon: 'auto_stories' },
        { id: 'quiz', label: 'Bài tập', icon: 'quiz' },
    ];

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

    if (!lesson) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <Icon name="error" size="xl" className="text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Không tìm thấy bài học</h1>
                    <Link href="/courses" className="mt-4 text-[var(--primary)] hover:underline">
                        Quay lại danh sách khóa học
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
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4">
                    <Link href="/" className="hover:text-[var(--primary)]">Trang chủ</Link>
                    <Icon name="chevron_right" size="xs" />
                    <Link href="/courses" className="hover:text-[var(--primary)]">Khóa học</Link>
                    <Icon name="chevron_right" size="xs" />
                    <span className="text-[var(--text-main)] line-clamp-1">{lesson.title}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main: Video + Tabs */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Video Player */}
                        {lesson.youtube_id ? (
                            <YouTubePlayer videoId={lesson.youtube_id} />
                        ) : (
                            <div className="w-full aspect-video bg-[var(--surface)] rounded-xl flex items-center justify-center">
                                <div className="text-center">
                                    <Icon name="videocam_off" size="xl" className="text-[var(--text-muted)] mb-2" />
                                    <p className="text-[var(--text-secondary)]">Video chưa sẵn sàng</p>
                                </div>
                            </div>
                        )}

                        {/* Lesson Title */}
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">{lesson.title}</h1>
                            {lesson.description && (
                                <p className="text-[var(--text-secondary)] mt-2">{lesson.description}</p>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-[var(--border)]">
                            <div className="flex gap-1 overflow-x-auto">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                            ? 'border-[var(--primary)] text-[var(--primary)]'
                                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                            }`}
                                    >
                                        <Icon name={tab.icon} size="sm" />
                                        {tab.label}
                                        {tab.id === 'vocab' && content.vocabulary.length > 0 && (
                                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--surface-secondary)] rounded-full">
                                                {content.vocabulary.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[300px]">
                            {activeTab === 'vocab' && (
                                <div className="space-y-3">
                                    {content.vocabulary.length === 0 ? (
                                        <div className="text-center py-12 text-[var(--text-muted)]">
                                            <Icon name="translate" size="lg" className="mb-2" />
                                            <p>Chưa có từ vựng cho bài học này</p>
                                        </div>
                                    ) : (
                                        content.vocabulary.map(vocab => (
                                            <VocabItem
                                                key={vocab.id}
                                                vocab={vocab}
                                                isSaved={savedVocabIds.has(vocab.id)}
                                                onSave={() => handleSaveVocab(vocab.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'grammar' && (
                                <div className="space-y-4">
                                    {content.grammar.length === 0 ? (
                                        <div className="text-center py-12 text-[var(--text-muted)]">
                                            <Icon name="auto_stories" size="lg" className="mb-2" />
                                            <p>Chưa có ngữ pháp cho bài học này</p>
                                        </div>
                                    ) : (
                                        content.grammar.map(grammar => (
                                            <div key={grammar.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                                <h3 className="font-bold text-[var(--text-main)] mb-2">{grammar.pattern}</h3>
                                                <p className="text-sm text-[var(--text-secondary)]">{grammar.explanation}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'quiz' && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-4">
                                        <Icon name="quiz" size="lg" className="text-[var(--primary)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Làm bài tập</h3>
                                    <p className="text-[var(--text-secondary)] mb-4">
                                        Hoàn thành bài tập để kiểm tra kiến thức đã học
                                    </p>
                                    <Button>
                                        <Icon name="play_arrow" size="sm" className="mr-2" />
                                        Bắt đầu làm bài
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Playlist */}
                    <div className="space-y-4">
                        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-[var(--text-main)]">Danh sách bài học</h3>
                                <span className="text-xs text-[var(--text-muted)]">2/10 Hoàn thành</span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 bg-[var(--background)] rounded-full mb-4 overflow-hidden">
                                <div className="h-full w-1/5 bg-[var(--primary)] rounded-full"></div>
                            </div>

                            {/* CTA */}
                            <Button fullWidth className="justify-center mb-4">
                                <Icon name="quiz" size="sm" className="mr-2" />
                                Làm bài tập
                            </Button>

                            {/* Lesson List placeholder */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                <div className="p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                                    <div className="flex items-center gap-2">
                                        <Icon name="play_circle" size="sm" className="text-[var(--primary)]" />
                                        <span className="text-sm font-medium text-[var(--primary)] line-clamp-1">{lesson.title}</span>
                                    </div>
                                </div>
                                {/* More lessons would be listed here */}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
