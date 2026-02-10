'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';
import { HSKBadge } from '@/components/ui/Badge';
import { playAudio } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

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

interface LessonItem {
    id: number;
    title: string;
    duration: number;
    order_index: number;
    youtube_id?: string;
    progress_status?: 'not_started' | 'in_progress' | 'completed' | null;
}

interface RawContent {
    id: number;
    type: 'VOCABULARY' | 'GRAMMAR' | 'SENTENCE';
    timestamp: number;
    data: string | Record<string, unknown>;
    order_index: number;
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

interface Course {
    id: number;
    title: string;
    hsk_level: number;
}

type TabType = 'vocab' | 'content' | 'grammar' | 'quiz';

function YouTubePlayer({ videoId }: { videoId: string }) {
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
                {onSave && (
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
                )}
            </div>
        </div>
    );
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function LessonPlayerPage() {
    const params = useParams();
    const { token } = useAuth();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [courseLessons, setCourseLessons] = useState<LessonItem[]>([]);
    const [vocabulary, setVocabulary] = useState<VocabContent[]>([]);
    const [grammarItems, setGrammarItems] = useState<GrammarContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('vocab');
    const [lessonStatus, setLessonStatus] = useState<string | null>(null);
    const [markingComplete, setMarkingComplete] = useState(false);

    const fetchCourseData = useCallback(async (courseId: number, headers: HeadersInit) => {
        try {
            const [courseRes, lessonsRes] = await Promise.all([
                fetch(`${API_BASE}/api/courses/${courseId}`, { headers }),
                fetch(`${API_BASE}/api/lessons/course/${courseId}`, { headers }),
            ]);

            const courseData = await courseRes.json();
            if (courseData.success) setCourse(courseData.data);

            const lessonsData = await lessonsRes.json();
            if (lessonsData.success) {
                const lessons = lessonsData.data || [];
                setCourseLessons(lessons);
                // Set current lesson's progress status
                const current = lessons.find((l: LessonItem) => l.id === Number(params.id));
                setLessonStatus(current?.progress_status ?? null);
            }
        } catch (error) {
            console.error('Failed to load course data', error);
        }
    }, [params.id]);

    const fetchLesson = useCallback(async () => {
        try {
            setLoading(true);
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/lessons/${params.id}`, { headers });
            const data = await res.json();

            if (data.success && data.data) {
                const lessonData = data.data;
                setLesson(lessonData);

                // Parse contents - DB returns {id, type (VOCABULARY/GRAMMAR/SENTENCE), timestamp, data (JSON), order_index}
                const vocabContents = (lessonData.contents || [])
                    .filter((c: RawContent) => c.type === 'VOCABULARY')
                    .map((c: RawContent) => {
                        const d = typeof c.data === 'string' ? JSON.parse(c.data) : (c.data || {});
                        return {
                            id: c.id,
                            simplified: d.text_content || '',
                            pinyin: d.pinyin || '',
                            meaning_vi: d.meaning || '',
                            timestamp: c.timestamp || 0,
                        };
                    });
                const grammarContents = (lessonData.contents || [])
                    .filter((c: RawContent) => c.type === 'GRAMMAR')
                    .map((c: RawContent) => {
                        const d = typeof c.data === 'string' ? JSON.parse(c.data) : (c.data || {});
                        return {
                            id: c.id,
                            pattern: d.text_content || '',
                            explanation: d.meaning || d.explanation || '',
                            examples: d.examples || [],
                        };
                    });
                setVocabulary(vocabContents);
                setGrammarItems(grammarContents);

                // Fetch course info and lesson list
                if (lessonData.course_id) {
                    fetchCourseData(lessonData.course_id, headers);
                }
            }
        } catch (error) {
            console.error('Failed to load lesson', error);
        } finally {
            setLoading(false);
        }
    }, [params.id, token, fetchCourseData]);

    const updateProgress = useCallback(async (status: 'in_progress' | 'completed'): Promise<boolean> => {
        if (!token) return false;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${params.id}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            return res.ok;
        } catch (error) {
            console.error('Failed to update progress', error);
            return false;
        }
    }, [params.id, token]);

    const handleMarkComplete = useCallback(async () => {
        setMarkingComplete(true);
        try {
            const ok = await updateProgress('completed');
            if (!ok) return;
            setLessonStatus('completed');
            // Refresh course lessons to update sidebar progress
            if (lesson?.course_id) {
                const headers: HeadersInit = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${API_BASE}/api/lessons/course/${lesson.course_id}`, { headers });
                const data = await res.json();
                if (data.success) setCourseLessons(data.data || []);
            }
        } catch (error) {
            console.error('Failed to mark complete', error);
        } finally {
            setMarkingComplete(false);
        }
    }, [updateProgress, lesson?.course_id, token]);

    useEffect(() => {
        if (params.id) {
            fetchLesson();
        }
    }, [params.id, fetchLesson]);

    // Auto-set in_progress when user opens lesson (if not already completed)
    useEffect(() => {
        if (lesson && token && !lessonStatus) {
            const setInProgress = async () => {
                const ok = await updateProgress('in_progress');
                if (ok) setLessonStatus('in_progress');
            };
            setInProgress();
        }
    }, [lesson, token, lessonStatus, updateProgress]);

    const tabs: { id: TabType; label: string; icon: string; count?: number }[] = [
        { id: 'vocab', label: 'Từ vựng', icon: 'translate', count: vocabulary.length },
        { id: 'content', label: 'Nội dung', icon: 'description' },
        { id: 'grammar', label: 'Ngữ pháp', icon: 'auto_stories', count: grammarItems.length },
        { id: 'quiz', label: 'Bài tập', icon: 'quiz' },
    ];

    const completedCount = courseLessons.filter(l => l.progress_status === 'completed').length;

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
                    <Link href="/" className="hover:text-[var(--primary)] transition-colors">Trang chủ</Link>
                    <Icon name="chevron_right" size="xs" />
                    <Link href="/courses" className="hover:text-[var(--primary)] transition-colors">Khóa học</Link>
                    {course && (
                        <>
                            <Icon name="chevron_right" size="xs" />
                            <Link href={`/courses/${course.id}`} className="hover:text-[var(--primary)] transition-colors">
                                {course.title}
                            </Link>
                        </>
                    )}
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
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">{lesson.title}</h1>
                                {lesson.description && (
                                    <p className="text-[var(--text-secondary)] mt-2">{lesson.description}</p>
                                )}
                            </div>
                            {course && (
                                <HSKBadge level={course.hsk_level as 1|2|3|4|5|6} />
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
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--surface-secondary)] rounded-full">
                                                {tab.count}
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
                                    {vocabulary.length === 0 ? (
                                        <div className="text-center py-12 text-[var(--text-muted)]">
                                            <Icon name="translate" size="lg" className="mb-2" />
                                            <p>Chưa có từ vựng cho bài học này</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                                                    Từ vựng chính ({vocabulary.length})
                                                </h3>
                                            </div>
                                            {vocabulary.map(vocab => (
                                                <VocabItem
                                                    key={vocab.id}
                                                    vocab={vocab}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'content' && (
                                <div className="text-center py-12 text-[var(--text-muted)]">
                                    <Icon name="description" size="lg" className="mb-2" />
                                    <p>Nội dung bài học sẽ được cập nhật</p>
                                </div>
                            )}

                            {activeTab === 'grammar' && (
                                <div className="space-y-4">
                                    {grammarItems.length === 0 ? (
                                        <div className="text-center py-12 text-[var(--text-muted)]">
                                            <Icon name="auto_stories" size="lg" className="mb-2" />
                                            <p>Chưa có ngữ pháp cho bài học này</p>
                                        </div>
                                    ) : (
                                        grammarItems.map(grammar => (
                                            <div key={grammar.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                                                <h3 className="font-bold text-[var(--text-main)] mb-2">{grammar.pattern}</h3>
                                                <p className="text-sm text-[var(--text-secondary)] mb-3">{grammar.explanation}</p>
                                                {grammar.examples && grammar.examples.length > 0 && (
                                                    <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                                                        {grammar.examples.map((ex, i) => (
                                                            <div key={i} className="flex items-start gap-3">
                                                                <button
                                                                    onClick={() => playAudio(ex.zh)}
                                                                    className="mt-0.5 w-7 h-7 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors shrink-0"
                                                                >
                                                                    <Icon name="volume_up" size="xs" />
                                                                </button>
                                                                <div>
                                                                    <p className="text-sm text-[var(--text-main)] hanzi">{ex.zh}</p>
                                                                    <p className="text-xs text-[var(--text-muted)]">{ex.vi}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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
                                        <Icon name="play_arrow" size="sm" />
                                        Bắt đầu làm bài
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Course Curriculum */}
                    <div className="space-y-4">
                        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-[var(--text-main)]">
                                    {course?.title || 'Danh sách bài học'}
                                </h3>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {completedCount}/{courseLessons.length} Hoàn thành
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 bg-[var(--background)] rounded-full mb-4 overflow-hidden">
                                <div
                                    className="h-full bg-[var(--primary)] rounded-full transition-all"
                                    style={{ width: courseLessons.length > 0 ? `${(completedCount / courseLessons.length) * 100}%` : '0%' }}
                                ></div>
                            </div>

                            {/* Quiz CTA */}
                            <Button fullWidth className="justify-center mb-2" onClick={() => setActiveTab('quiz')}>
                                <Icon name="quiz" size="sm" />
                                Làm bài tập
                            </Button>

                            {/* Mark Complete Button */}
                            {token && lessonStatus !== 'completed' && (
                                <Button
                                    fullWidth
                                    className="justify-center mb-4 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleMarkComplete}
                                    disabled={markingComplete}
                                >
                                    <Icon name={markingComplete ? 'hourglass_empty' : 'check_circle'} size="sm" />
                                    {markingComplete ? 'Đang xử lý...' : 'Hoàn thành bài học'}
                                </Button>
                            )}
                            {lessonStatus === 'completed' && (
                                <div className="flex items-center gap-2 justify-center mb-4 py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-medium">
                                    <Icon name="check_circle" size="sm" />
                                    Đã hoàn thành
                                </div>
                            )}

                            {/* Lesson List */}
                            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                                {courseLessons.length > 0 ? (
                                    courseLessons.map((item, idx) => {
                                        const isCurrent = item.id === Number(params.id);
                                        const isCompleted = item.progress_status === 'completed';

                                        return (
                                            <Link
                                                key={item.id}
                                                href={`/lessons/${item.id}`}
                                                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${
                                                    isCurrent
                                                        ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30'
                                                        : 'hover:bg-[var(--surface-secondary)]'
                                                }`}
                                            >
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                                    isCurrent
                                                        ? 'bg-[var(--primary)] text-white'
                                                        : isCompleted
                                                            ? 'bg-emerald-500/20 text-emerald-500'
                                                            : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                                                }`}>
                                                    {isCurrent ? (
                                                        <Icon name="play_arrow" size="xs" />
                                                    ) : isCompleted ? (
                                                        <Icon name="check" size="xs" />
                                                    ) : (
                                                        idx + 1
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium line-clamp-1 ${
                                                        isCurrent ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'
                                                    }`}>
                                                        {item.title}
                                                    </p>
                                                    {item.duration > 0 && (
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            {formatDuration(item.duration)}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                                        <div className="flex items-center gap-2">
                                            <Icon name="play_circle" size="sm" className="text-[var(--primary)]" />
                                            <span className="text-sm font-medium text-[var(--primary)] line-clamp-1">{lesson.title}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
