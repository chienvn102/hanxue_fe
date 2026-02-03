'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { playAudio } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Content {
    id: number;
    start_time: number;
    end_time: number;
    content_type: 'vocabulary' | 'grammar' | 'sentence';
    text_content: string;
    pinyin: string;
    meaning: string;
    explanation: string;
}

interface Lesson {
    id: number;
    title: string;
    youtube_id: string;
    contents: Content[];
    course_id: number;
}

export default function LearningPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [activeContentId, setActiveContentId] = useState<number | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    const playerRef = useRef<any>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (params.id) fetchLesson();
    }, [params.id]);

    // Load YouTube API
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
            // Cleanup if needed
        }
    }, [lesson]);

    // Timer loop for sync
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const time = playerRef.current.getCurrentTime();
                setCurrentTime(time);
                checkActiveContent(time);
            }
        }, 500); // Check every 0.5s
        return () => clearInterval(interval);
    }, [lesson]);

    const initPlayer = () => {
        if (playerRef.current) return;

        playerRef.current = new window.YT.Player('learn-player', {
            height: '100%',
            width: '100%',
            videoId: lesson?.youtube_id,
            playerVars: {
                'playsinline': 1,
                'modestbranding': 1,
                'rel': 0
            },
            events: {
                'onStateChange': (event: any) => {
                    // Could track play/pause state here
                }
            }
        });
    };

    const fetchLesson = async () => {
        try {
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE}/api/lessons/${params.id}`, { headers });
            const data = await res.json();
            if (data.success) {
                setLesson(data.data);
            }
        } catch (error) {
            console.error('Failed to load lesson', error);
        } finally {
            setLoading(false);
        }
    };

    const checkActiveContent = (time: number) => {
        if (!lesson?.contents) return;

        // Find content that matches current time
        const active = lesson.contents.find(c => time >= c.start_time && time <= c.end_time);

        if (active && active.id !== activeContentId) {
            setActiveContentId(active.id);
            if (autoScroll) scrollToContent(active.id);
        } else if (!active) {
            // Optional: clear active state or keep last one? Keeping last one is usually better context
            // setActiveContentId(null); 
        }
    };

    const scrollToContent = (id: number) => {
        const el = document.getElementById(`content-${id}`);
        if (el && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: el.offsetTop - 100, // Offset for header/padding
                behavior: 'smooth'
            });
        }
    };

    const seekTo = (time: number) => {
        playerRef.current?.seekTo(time, true);
        playerRef.current?.playVideo();
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading Lesson...</div>;
    if (!lesson) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Lesson Not Found</div>;

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 bg-gray-900 z-10">
                <div className="flex items-center gap-4">
                    <Link href={`/courses/${lesson.course_id}`} className="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
                        <Icon name="arrow_back" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg truncate max-w-md">{lesson.title}</h1>
                        <p className="text-xs text-gray-500">Video Learning Mode</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full text-xs font-mono text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${activeContentId ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
                        {new Date(currentTime * 1000).toISOString().substr(14, 5)}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setAutoScroll(!autoScroll)} className={autoScroll ? 'text-[var(--primary)]' : 'text-gray-500'}>
                        <Icon name="vertical_align_center" />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Video Player */}
                <div className="flex-1 bg-black relative flex flex-col justify-center">
                    <div className="aspect-video w-full max-h-full">
                        <div id="learn-player" className="w-full h-full"></div>
                    </div>
                </div>

                {/* Right: Knowledge Panel */}
                <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-800 bg-gray-900">
                        <h2 className="font-bold text-gray-300 flex items-center gap-2">
                            <Icon name="menu_book" className="text-[var(--primary)]" />
                            Kiến thức bài học
                        </h2>
                    </div>

                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                        {lesson.contents?.length === 0 && (
                            <p className="text-center text-gray-600 py-10 text-sm">Chưa có nội dung cho bài học này.</p>
                        )}
                        {lesson.contents?.map((content) => (
                            <div
                                key={content.id}
                                id={`content-${content.id}`}
                                onClick={() => seekTo(content.start_time)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group ${activeContentId === content.id
                                        ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-lg shadow-[var(--primary)]/5'
                                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${content.content_type === 'vocabulary' ? 'text-green-400 bg-green-400/10' :
                                            content.content_type === 'grammar' ? 'text-purple-400 bg-purple-400/10' :
                                                'text-blue-400 bg-blue-400/10'
                                        }`}>
                                        {content.content_type}
                                    </span>
                                    <span className="text-xs font-mono text-gray-500 group-hover:text-gray-300 transition-colors">
                                        {new Date(content.start_time * 1000).toISOString().substr(14, 5)}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-end gap-3">
                                        <h3 className="text-2xl font-bold text-white">{content.text_content}</h3>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playAudio(content.text_content); }}
                                            className="pb-1.5 text-gray-400 hover:text-[var(--primary)] transition-colors"
                                        >
                                            <Icon name="volume_up" size="sm" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-[var(--primary)] font-medium">{content.pinyin}</p>
                                    <p className="text-gray-300">{content.meaning}</p>
                                    {content.explanation && (
                                        <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700/50 italic">
                                            {content.explanation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
