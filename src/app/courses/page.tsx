'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    completed_lessons?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

// HSK Level colors
const hskColors: Record<number, { bg: string; text: string; badge: string }> = {
    1: { bg: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    2: { bg: 'from-sky-500/20 to-sky-600/10', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    3: { bg: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    4: { bg: 'from-orange-500/20 to-orange-600/10', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    5: { bg: 'from-rose-500/20 to-rose-600/10', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    6: { bg: 'from-purple-500/20 to-purple-600/10', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

const hskLabels: Record<number, string> = {
    1: 'Sơ cấp',
    2: 'Sơ cấp',
    3: 'Trung cấp',
    4: 'Trung cấp',
    5: 'Cao cấp',
    6: 'Cao cấp',
};

function CourseCard({ course }: { course: Course }) {
    const colors = hskColors[course.hsk_level] || hskColors[1];
    const progress = course.lesson_count > 0 && course.completed_lessons
        ? Math.round((course.completed_lessons / course.lesson_count) * 100)
        : 0;
    const isInProgress = progress > 0 && progress < 100;
    const isCompleted = progress === 100;

    return (
        <Link href={`/courses/${course.id}`} className="group">
            <article className={`relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--primary)]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary)]/5 ${isInProgress ? 'ring-2 ring-[var(--primary)]/30' : ''}`}>
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`}></div>

                {/* Content */}
                <div className="relative p-6">
                    {/* Header: Level badge + Status */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                {hskLabels[course.hsk_level]}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${colors.badge}`}>
                                H{course.hsk_level}
                            </span>
                        </div>
                        {isCompleted && (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Icon name="check_circle" size="sm" className="text-emerald-400" />
                            </div>
                        )}
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-xl font-bold text-[var(--text-main)] mb-2 group-hover:text-[var(--primary)] transition-colors">
                        {course.title}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 min-h-[40px]">
                        {course.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-4">
                        <span className="flex items-center gap-1">
                            <Icon name="play_circle" size="sm" />
                            {course.lesson_count} bài học
                        </span>
                    </div>

                    {/* Progress Bar */}
                    {course.lesson_count > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--text-muted)]">Tiến độ</span>
                                <span className={progress > 0 ? 'text-[var(--primary)] font-medium' : 'text-[var(--text-muted)]'}>
                                    {progress > 0 ? `Đang học: ${progress}%` : 'Hoàn thành'}
                                </span>
                            </div>
                            <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[var(--primary)] to-orange-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* CTA Button for in-progress course */}
                    {isInProgress && (
                        <button className="mt-4 w-full py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-dark)] transition-colors flex items-center justify-center gap-2">
                            <Icon name="play_arrow" size="sm" />
                            Tiếp tục học
                        </button>
                    )}
                </div>
            </article>
        </Link>
    );
}

export default function CoursesPage() {
    const { token } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const headers: HeadersInit = {};
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

    // Filter courses by search
    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Section */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-3">
                        Lộ trình chinh phục <span className="text-[var(--primary)]">tiếng Trung</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
                        Khám phá kho tàng kiến thức từ HSK 1 đến HSK 6. Chọn cấp độ phù hợp và bắt đầu hành trình của bạn ngay hôm nay.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-xl mx-auto mb-10">
                    <div className="relative">
                        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm khóa học, ngữ pháp, từ vựng..."
                            className="w-full pl-12 pr-4 py-3.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-dark)] transition-colors">
                            <Icon name="arrow_forward" size="sm" />
                        </button>
                    </div>
                </div>

                {/* Course Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-72 rounded-2xl skeleton"></div>
                        ))}
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-20">
                        <Icon name="school" size="xl" className="text-[var(--text-muted)] mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-[var(--text-main)]">
                            {searchQuery ? 'Không tìm thấy khóa học' : 'Chưa có khóa học nào'}
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Vui lòng quay lại sau nhé!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course, index) => (
                            <div
                                key={course.id}
                                className="animate-fade-in"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <CourseCard course={course} />
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
