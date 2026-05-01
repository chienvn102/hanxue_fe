'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';
import { HSKBadge } from '@/components/ui/Badge';
import TextbookLesson from '@/components/lesson/TextbookLesson';
import {
    fetchLessonById,
    fetchCourseById,
    fetchLessonsByCourse,
    updateLessonProgress,
} from '@/lib/api';

interface LessonItem {
    id: number;
    title: string;
    order_index: number;
    progress_status?: 'not_started' | 'in_progress' | 'completed' | null;
}

interface LessonShell {
    id: number;
    title: string;
    description?: string;
    course_id: number;
    order_index: number;
}

interface Course {
    id: number;
    title: string;
    hsk_level: number;
}

export default function LessonPage() {
    const params = useParams();
    const { isAuthenticated } = useAuth();
    const [lesson, setLesson] = useState<LessonShell | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [courseLessons, setCourseLessons] = useState<LessonItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCourseData = useCallback(async (courseId: number) => {
        try {
            const [courseData, lessonsData] = await Promise.all([
                fetchCourseById(courseId),
                fetchLessonsByCourse(courseId),
            ]);
            const cd = courseData as { success: boolean; data: Course };
            if (cd.success) setCourse(cd.data);
            const ld = lessonsData as { success: boolean; data: LessonItem[] };
            if (ld.success) setCourseLessons(ld.data || []);
        } catch (err) {
            console.error('Failed to load course data', err);
        }
    }, []);

    const fetchLessonShell = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchLessonById(params.id as string);
            const response = data as { success: boolean; data: LessonShell };
            if (response.success && response.data) {
                setLesson(response.data);
                if (response.data.course_id) {
                    await fetchCourseData(response.data.course_id);
                }
            }
        } catch (err) {
            console.error('Failed to load lesson', err);
        } finally {
            setLoading(false);
        }
    }, [params.id, fetchCourseData]);

    useEffect(() => {
        if (params.id) fetchLessonShell();
    }, [params.id, fetchLessonShell]);

    // Auto-mark in_progress when authenticated user opens the lesson.
    // Section-level mark-done lives inside <TextbookLesson/>.
    useEffect(() => {
        if (lesson && isAuthenticated) {
            updateLessonProgress(params.id as string, { status: 'in_progress' }).catch(err =>
                console.error('Failed to set in_progress', err),
            );
        }
    }, [lesson, isAuthenticated, params.id]);

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

    const completedCount = courseLessons.filter(l => l.progress_status === 'completed').length;

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
                    {/* Main: Lesson title + textbook content */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">{lesson.title}</h1>
                                {lesson.description && (
                                    <p className="text-[var(--text-secondary)] mt-2">{lesson.description}</p>
                                )}
                            </div>
                            {course && (
                                <HSKBadge level={course.hsk_level as 1 | 2 | 3 | 4 | 5 | 6} />
                            )}
                        </div>

                        <TextbookLesson lessonId={params.id as string} />
                    </div>

                    {/* Sidebar: course curriculum */}
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

                            <div className="h-1.5 bg-[var(--background)] rounded-full mb-4 overflow-hidden">
                                <div
                                    className="h-full bg-[var(--primary)] rounded-full transition-all"
                                    style={{ width: courseLessons.length > 0 ? `${(completedCount / courseLessons.length) * 100}%` : '0%' }}
                                ></div>
                            </div>

                            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
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
