'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';

interface Lesson {
    id: number;
    title: string;
    duration: number;
    order_index: number;
    content_count: number;
}

interface Course {
    id: number;
    title: string;
    description: string;
    hsk_level: number;
    thumbnail_url: string;
    lesson_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CourseDetailPage() {
    const params = useParams();
    const { token, isAuthenticated } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchData();
        }
    }, [params.id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Fetch course details
            const courseRes = await fetch(`${API_BASE}/api/courses/${params.id}`, { headers });
            const courseData = await courseRes.json();

            // Fetch lessons
            const lessonsRes = await fetch(`${API_BASE}/api/lessons/course/${params.id}`, { headers });
            const lessonsData = await lessonsRes.json();

            if (courseData.success) setCourse(courseData.data);
            if (lessonsData.success) setLessons(lessonsData.data);
        } catch (error) {
            console.error('Failed to load course data', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <Icon name="error" size="xl" className="text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900">Không tìm thấy khóa học</h1>
                    <Link href="/courses" className="mt-4 text-[var(--primary)] hover:underline">
                        Quay lại danh sách
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Hero Section */}
            <div className="relative bg-gray-900 text-white overflow-hidden">
                {/* Background Image with Blur */}
                {course.thumbnail_url && (
                    <div className="absolute inset-0 opacity-30 blur-xl scale-110">
                        <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <span className="inline-block bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                            HSK {course.hsk_level}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold leading-tight">{course.title}</h1>
                        <p className="text-gray-300 text-lg max-w-2xl">{course.description}</p>

                        <div className="flex items-center gap-6 justify-center md:justify-start pt-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <Icon name="play_lesson" size="sm" />
                                <span>{lessons.length} Bài học</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon name="schedule" size="sm" />
                                <span>{Math.floor(lessons.reduce((acc, l) => acc + l.duration, 0) / 60)} phút</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon name="group" size="sm" />
                                <span>120+ Học viên</span>
                            </div>
                        </div>

                        <div className="pt-6">
                            {lessons.length > 0 ? (
                                <Link href={`/learn/${lessons[0].id}`}>
                                    <Button size="lg" className="rounded-full px-8 shadow-lg shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 transition-all">
                                        <Icon name="play_arrow" className="mr-2" />
                                        Bắt đầu học ngay
                                    </Button>
                                </Link>
                            ) : (
                                <Button disabled size="lg" variant="secondary" className="rounded-full">
                                    Chưa có bài học
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Course Thumbnail Card */}
                    <div className="hidden md:block w-80 shrink-0">
                        <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 rotate-3 hover:rotate-0 transition-all duration-500">
                            {course.thumbnail_url ? (
                                <img src={course.thumbnail_url} alt={course.title} className="w-full aspect-[3/4] object-cover" />
                            ) : (
                                <div className="w-full aspect-[3/4] bg-gray-800 flex items-center justify-center">
                                    <Icon name="school" size="xl" className="text-gray-600" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Syllabus Section */}
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Icon name="list_alt" className="text-[var(--primary)]" />
                    Nội dung khóa học
                </h2>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {lessons.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Đang cập nhật nội dung...
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {lessons.map((lesson, index) => (
                                <Link href={`/learn/${lesson.id}`} key={lesson.id} className="block group hover:bg-gray-50 transition-colors">
                                    <div className="p-4 sm:p-6 flex items-center gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[var(--primary)] transition-colors truncate">
                                                {lesson.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Icon name="schedule" size="xs" />
                                                    {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Icon name="translate" size="xs" />
                                                    {lesson.content_count} từ vựng
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {index === 0 ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                                                    <Icon name="play_arrow" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400">
                                                    <Icon name="lock" size="sm" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
