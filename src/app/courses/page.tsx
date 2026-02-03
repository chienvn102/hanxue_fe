'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';

interface Course {
    id: number;
    title: string;
    description: string;
    hsk_level: number;
    thumbnail_url: string;
    lesson_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CoursesPage() {
    const { token, isAuthenticated } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                // If not authenticated, we might want to show public courses or redirect
                // For now, assuming public or token is handled by middleware if strict
                const headers: any = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE}/api/courses`, { headers });
                const data = await res.json();

                if (data.success) {
                    setCourses(data.data);
                }
            } catch (error) {
                console.error('Failed to load courses', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [token]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Khóa học Video</h1>
                    <p className="text-gray-500 mt-2">Học tiếng Trung qua các video bài giảng chi tiết theo chuẩn HSK.</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden h-80 animate-pulse">
                                <div className="h-40 bg-gray-200"></div>
                                <div className="p-6 space-y-3">
                                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20">
                        <Icon name="school" size="xl" className="text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900">Chưa có khóa học nào</h3>
                        <p className="text-gray-500">Vui lòng quay lại sau nhé!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <Link href={`/courses/${course.id}`} key={course.id} className="group">
                                <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300">
                                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                                        {course.thumbnail_url ? (
                                            <img
                                                src={course.thumbnail_url}
                                                alt={course.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                <Icon name="image" size="lg" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                                HSK {course.hsk_level}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                                            {course.title}
                                        </h2>
                                        <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">
                                            {course.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-sm">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Icon name="play_circle" size="sm" className="text-[var(--primary)]" />
                                                <span>{course.lesson_count} bài học</span>
                                            </div>
                                            <span className="text-[var(--primary)] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
                                                Vào học <Icon name="arrow_forward" size="sm" />
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
