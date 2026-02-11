'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types — matches DB schema: contents table has type/timestamp/data(JSON)/order_index
interface ContentRaw {
    id: number;
    lesson_id: number;
    type: 'VOCABULARY' | 'GRAMMAR' | 'SENTENCE';
    timestamp: number;
    data: string | { text_content?: string; pinyin?: string; meaning?: string; explanation?: string; start_time?: number; end_time?: number };
    order_index: number;
}

// Parsed content for display in editor
interface ContentDisplay {
    id: number;
    start_time: number;
    end_time: number;
    content_type: string;
    text_content: string;
    pinyin: string;
    meaning: string;
    explanation: string;
}

function parseContent(raw: ContentRaw): ContentDisplay {
    let d: Record<string, unknown> = {};
    try {
        d = typeof raw.data === 'string' ? JSON.parse(raw.data) : (raw.data || {});
    } catch {
        d = {};
    }
    return {
        id: raw.id,
        start_time: (d.start_time as number) ?? raw.timestamp ?? 0,
        end_time: (d.end_time as number) ?? 0,
        content_type: (raw.type || 'vocabulary').toLowerCase(),
        text_content: (d.text_content as string) || '',
        pinyin: (d.pinyin as string) || '',
        meaning: (d.meaning as string) || '',
        explanation: (d.explanation as string) || '',
    };
}

interface Lesson {
    id: number;
    course_id: number;
    title: string;
    youtube_id: string;
    duration: number;
    contents: ContentRaw[];
}

export default function LessonEditorPage() {
    const { token } = useAdminAuth();
    const params = useParams();
    const router = useRouter();
    const lessonId = params.id;

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const playerRef = useRef<any>(null); // YouTube Player reference

    // Form state for new content
    const [contentForm, setContentForm] = useState({
        start_time: 0,
        end_time: 0,
        content_type: 'vocabulary',
        text_content: '',
        pinyin: '',
        meaning: '',
        explanation: ''
    });

    useEffect(() => {
        if (lessonId && token) {
            fetchLessonDetails();
        }
    }, [lessonId, token]);

    // Load YouTube IFrame API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        } else if (lesson) {
            initPlayer();
        }

        window.onYouTubeIframeAPIReady = () => {
            if (lesson) initPlayer();
        };

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        }
    }, [lesson]);

    // Cleanup interval
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                setCurrentTime(playerRef.current.getCurrentTime());
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const initPlayer = () => {
        if (playerRef.current) return; // Already initialized

        playerRef.current = new window.YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: lesson?.youtube_id,
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'modestbranding': 1
            },
        });
    };

    const fetchLessonDetails = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setLesson(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch lesson:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCaptureStart = () => {
        const time = playerRef.current?.getCurrentTime() || 0;
        setContentForm({ ...contentForm, start_time: Math.floor(time) });
    };

    const handleCaptureEnd = () => {
        const time = playerRef.current?.getCurrentTime() || 0;
        setContentForm({ ...contentForm, end_time: Math.ceil(time) });
    };

    const handleAddContent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/contents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(contentForm)
            });

            if (res.ok) {
                // Reset form but keep type
                setContentForm({
                    ...contentForm,
                    start_time: 0,
                    end_time: 0,
                    text_content: '',
                    pinyin: '',
                    meaning: '',
                    explanation: ''
                });
                fetchLessonDetails(); // Refresh
            }
        } catch (error) {
            console.error('Failed to add content:', error);
        }
    };

    const seekTo = (time: number) => {
        playerRef.current?.seekTo(time, true);
    };

    if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Đang tải trình soạn thảo...</div>;
    if (!lesson) return <div className="p-8 text-center text-red-500">Không tìm thấy bài học</div>;

    return (
        <div className="h-screen flex flex-col bg-[var(--background)] overflow-hidden">
            {/* Header */}
            <header className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/courses/${lesson.course_id}/lessons`} className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] transition-colors">
                        <Icon name="arrow_back" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-[var(--text-main)]">{lesson.title}</h1>
                        <p className="text-xs text-[var(--text-muted)] font-mono">ID: {lesson.youtube_id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-mono bg-[var(--surface-secondary)] px-3 py-1 rounded-md text-[var(--text-secondary)]">
                        {new Date(currentTime * 1000).toISOString().substr(11, 8)}
                    </span>
                    <Button variant="outline" size="sm">Xem trước</Button>
                    <Button size="sm">Lưu thay đổi</Button>
                </div>
            </header>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left: Video Player */}
                <div className="w-1/2 bg-black flex flex-col">
                    <div className="flex-1 relative">
                        <div id="youtube-player" className="absolute inset-0 w-full h-full"></div>
                    </div>
                    {/* Timeline / Controls could go here */}
                    <div className="bg-gray-900 p-4 text-white flex justify-between items-center text-sm">
                        <p>Sử dụng các nút Capture để lấy thời gian từ video.</p>
                        <div className="flex gap-2">
                            <button onClick={handleCaptureStart} className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500 text-xs">
                                Set Start: {contentForm.start_time}s
                            </button>
                            <button onClick={handleCaptureEnd} className="px-3 py-1 bg-red-600 rounded hover:bg-red-500 text-xs">
                                Set End: {contentForm.end_time}s
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Content Editor & List */}
                <div className="w-1/2 flex flex-col bg-[var(--surface)] border-l border-[var(--border)]">

                    {/* Add Content Form */}
                    <div className="p-6 border-b border-[var(--border)] bg-[var(--background)] overflow-y-auto max-h-[50%] shrink-0">
                        <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <Icon name="add_circle" className="text-[var(--primary)]" />
                            Thêm Điểm kiến thức
                        </h3>
                        <form onSubmit={handleAddContent} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Thời gian bắt đầu (s)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={contentForm.start_time}
                                            onChange={e => setContentForm({ ...contentForm, start_time: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none"
                                        />
                                        <button type="button" onClick={handleCaptureStart} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20" title="Capture Current Time">
                                            <Icon name="timer" size="sm" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Thời gian kết thúc (s)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={contentForm.end_time}
                                            onChange={e => setContentForm({ ...contentForm, end_time: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none"
                                        />
                                        <button type="button" onClick={handleCaptureEnd} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20" title="Capture Current Time">
                                            <Icon name="timer" size="sm" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Loại nội dung</label>
                                <select
                                    value={contentForm.content_type}
                                    onChange={e => setContentForm({ ...contentForm, content_type: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none"
                                >
                                    <option value="vocabulary">Từ vựng (Vocabulary)</option>
                                    <option value="grammar">Ngữ pháp (Grammar)</option>
                                    <option value="sentence">Mẫu câu (Sentence)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Nội dung (Hanzi)</label>
                                    <input
                                        type="text"
                                        required
                                        value={contentForm.text_content}
                                        onChange={e => setContentForm({ ...contentForm, text_content: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none font-medium"
                                        placeholder="ví dụ: 你好"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Pinyin</label>
                                    <input
                                        type="text"
                                        value={contentForm.pinyin}
                                        onChange={e => setContentForm({ ...contentForm, pinyin: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none"
                                        placeholder="ví dụ: nǐ hǎo"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Ý nghĩa (Tiếng Việt)</label>
                                <input
                                    type="text"
                                    value={contentForm.meaning}
                                    onChange={e => setContentForm({ ...contentForm, meaning: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none"
                                    placeholder="ví dụ: Xin chào"
                                />
                            </div>

                            <Button type="submit" fullWidth size="sm">Thêm vào bài học</Button>
                        </form>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto p-0">
                        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 flex justify-between items-center shadow-sm z-10">
                            <h3 className="font-bold text-[var(--text-main)]">Danh sách nội dung ({lesson.contents?.length || 0})</h3>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {lesson.contents?.length === 0 && (
                                <p className="text-center text-[var(--text-muted)] py-8 text-sm">Chưa có nội dung nào.</p>
                            )}
                            {lesson.contents?.map((rawContent) => {
                                const content = parseContent(rawContent);
                                return (
                                <div key={content.id} className="p-4 hover:bg-[var(--background)] transition-colors flex gap-4 group cursor-pointer" onClick={() => seekTo(content.start_time)}>
                                    <div className="mt-1">
                                        <span className="text-xs font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-2 py-1 rounded">
                                            {content.start_time}s - {content.end_time}s
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${content.content_type === 'vocabulary' ? 'border-green-500/20 text-green-500 bg-green-500/10' :
                                                    content.content_type === 'grammar' ? 'border-purple-500/20 text-purple-500 bg-purple-500/10' :
                                                        'border-blue-500/20 text-blue-500 bg-blue-500/10'
                                                }`}>
                                                {content.content_type}
                                            </span>
                                            <h4 className="font-bold text-[var(--text-main)]">{content.text_content}</h4>
                                            <span className="text-sm text-[var(--text-muted)]">[{content.pinyin}]</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)]">{content.meaning}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                        <button className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 rounded hover:bg-blue-500/10">
                                            <Icon name="edit" size="sm" />
                                        </button>
                                        <button className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded hover:bg-red-500/10">
                                            <Icon name="delete" size="sm" />
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
