'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';
import { fetchCourseById, fetchLessonsByCourse, fetchCourseFinalExam, type CourseFinalExamStatus } from '@/lib/api';

interface Lesson {
    id: number;
    title: string;
    description?: string;
    order_index: number;
    content_count: number;
    youtube_id?: string;
    progress_status?: 'not_started' | 'in_progress' | 'completed' | null;
}

interface Course {
    id: number;
    title: string;
    description: string;
    hsk_level: number;
    thumbnail_url: string;
    lesson_count: number;
    completed_lessons?: number;
}

// HSK Level colors
const hskColors: Record<number, { badge: string; progress: string }> = {
    1: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', progress: 'from-emerald-500 to-emerald-400' },
    2: { badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30', progress: 'from-sky-500 to-sky-400' },
    3: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', progress: 'from-amber-500 to-amber-400' },
    4: { badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', progress: 'from-orange-500 to-orange-400' },
    5: { badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', progress: 'from-rose-500 to-rose-400' },
    6: { badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', progress: 'from-purple-500 to-purple-400' },
};

function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    className="text-[var(--surface-secondary)]"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="text-[var(--primary)] transition-all duration-500"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--text-main)]">{progress}%</span>
                <span className="text-xs text-[var(--text-muted)]">HOÀN THÀNH</span>
            </div>
        </div>
    );
}

function LessonCard({ lesson, index, isCompleted, isInProgress, isLocked }: {
    lesson: Lesson;
    index: number;
    isCompleted: boolean;
    isInProgress: boolean;
    isLocked: boolean;
}) {
    const statusIcon = isCompleted ? 'check_circle' : isInProgress ? 'pending' : isLocked ? 'lock' : 'play_circle';
    const statusColor = isCompleted ? 'text-emerald-400' : isInProgress ? 'text-amber-500' : isLocked ? 'text-[var(--text-muted)]' : 'text-[var(--primary)]';

    return (
        <Link
            href={isLocked ? '#' : `/lessons/${lesson.id}`}
            className={`group block ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            <div className={`p-4 rounded-xl border transition-all duration-200 ${isLocked
                ? 'bg-[var(--surface)] border-[var(--border)]'
                : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-secondary)]'
                }`}>
                <div className="flex items-start gap-4">
                    {/* Thumbnail/Icon */}
                    <div className="relative w-20 h-14 rounded-lg bg-[var(--background)] overflow-hidden flex-shrink-0">
                        {lesson.youtube_id ? (
                            <img
                                src={`https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`}
                                alt={lesson.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Icon name="play_circle" className="text-[var(--text-muted)]" />
                            </div>
                        )}
                        {!isLocked && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icon name="play_arrow" className="text-white" />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className={`font-semibold text-[var(--text-main)] line-clamp-1 ${!isLocked ? 'group-hover:text-[var(--primary)]' : ''} transition-colors`}>
                                        Bài {index + 1}: {lesson.title}
                                    </h3>
                                    {isCompleted && (
                                        <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">Hoàn thành</span>
                                    )}
                                    {isInProgress && (
                                        <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">Đang học</span>
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                                    {lesson.description || 'Video bài giảng'}
                                </p>
                            </div>
                            <Icon name={statusIcon} className={statusColor} />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                            {lesson.content_count > 0 && (
                                <span className="flex items-center gap-1">
                                    <Icon name="translate" size="xs" />
                                    {lesson.content_count} từ vựng
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [lockedMsg, setLockedMsg] = useState<string | null>(null);
    const [finalExam, setFinalExam] = useState<CourseFinalExamStatus | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setLockedMsg(null);
            const [courseData, lessonsData] = await Promise.all([
                fetchCourseById(params.id as string),
                fetchLessonsByCourse(params.id as string)
            ]);

            const cd = courseData as { success: boolean; data: Course };
            const ld = lessonsData as { success: boolean; data: Lesson[] };
            if (cd.success) setCourse(cd.data);
            if (ld.success) setLessons(ld.data);

            // Best-effort: end-of-course exam status (only meaningful when set).
            try {
                const fe = await fetchCourseFinalExam(params.id as string);
                setFinalExam(fe?.examId ? fe : null);
            } catch {
                setFinalExam(null);
            }
        } catch (error) {
            const errCode = (error as { code?: string })?.code;
            if (errCode === 'COURSE_LOCKED') {
                const msg = (error as Error).message || 'Khoá này bị khoá. Hoàn thành khoá trước để mở.';
                setLockedMsg(msg);
                setTimeout(() => router.push('/courses'), 2000);
                return;
            }
            console.error('Failed to load course data', error);
        } finally {
            setLoading(false);
        }
    }, [params.id, router]);

    useEffect(() => {
        if (params.id) {
            fetchData();
        }
    }, [params.id, isAuthenticated, fetchData]);

    // Tiến trình tính TRỰC TIẾP từ progress_status mỗi bài (model đã join
    // user_lesson_progress) — đáng tin hơn course.completed_lessons (endpoint
    // course không tính per-user → trước đây luôn hiện 0% dù bài đã hoàn thành).
    const completedCount = lessons.filter(l => l.progress_status === 'completed').length;
    const progress = lessons.length > 0
        ? Math.round((completedCount / lessons.length) * 100)
        : 0;

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

    if (lockedMsg) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                    <Icon name="lock" size="xl" className="text-amber-400 mb-4" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Khoá đang bị khoá</h1>
                    <p className="text-[var(--text-secondary)] mb-4">{lockedMsg}</p>
                    <p className="text-xs text-[var(--text-muted)]">Đang chuyển về danh sách khoá học...</p>
                    <Link href="/courses" className="mt-4 text-[var(--primary)] hover:underline">
                        Quay lại ngay
                    </Link>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <Icon name="error" size="xl" className="text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Không tìm thấy khóa học</h1>
                    <Link href="/courses" className="mt-4 text-[var(--primary)] hover:underline">
                        Quay lại danh sách
                    </Link>
                </div>
            </div>
        );
    }

    const colors = hskColors[course.hsk_level] || hskColors[1];

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                    <Link href="/" className="hover:text-[var(--primary)]">Trang chủ</Link>
                    <Icon name="chevron_right" size="xs" />
                    <Link href="/courses" className="hover:text-[var(--primary)]">Khóa học</Link>
                    <Icon name="chevron_right" size="xs" />
                    <span className="text-[var(--text-main)]">HSK {course.hsk_level}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Course Header */}
                        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border ${colors.badge}`}>
                                    HSK {course.hsk_level}
                                </span>
                                {progress > 0 && (
                                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                                        Đang học
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] mb-3">
                                {course.title}
                            </h1>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                {course.description}
                            </p>
                        </div>

                        {/* Lesson List */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <Icon name="playlist_play" className="text-[var(--primary)]" />
                                    Danh sách bài học
                                </h2>
                                <span className="text-sm text-[var(--text-muted)]">
                                    {completedCount > 0 ? `${completedCount}/${lessons.length} hoàn thành` : `${lessons.length} bài`}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {lessons.length === 0 ? (
                                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8 text-center">
                                        <Icon name="hourglass_empty" size="lg" className="text-[var(--text-muted)] mb-2" />
                                        <p className="text-[var(--text-secondary)]">Đang cập nhật nội dung...</p>
                                    </div>
                                ) : (
                                    lessons.map((lesson, index) => {
                                        // Khóa bài mặc định BẬT: phải hoàn thành bài trước
                                        // (đạt ≥70%) mới mở bài kế. Tắt bằng env
                                        // NEXT_PUBLIC_COURSE_UNLOCK_ENFORCEMENT=false.
                                        const enforceUnlock = process.env.NEXT_PUBLIC_COURSE_UNLOCK_ENFORCEMENT !== 'false';
                                        const isLocked = enforceUnlock
                                            && index > 0
                                            && lessons[index - 1].progress_status !== 'completed'
                                            && lesson.progress_status !== 'completed'
                                            && lesson.progress_status !== 'in_progress';
                                        return (
                                            <LessonCard
                                                key={lesson.id}
                                                lesson={lesson}
                                                index={index}
                                                isCompleted={lesson.progress_status === 'completed'}
                                                isInProgress={lesson.progress_status === 'in_progress'}
                                                isLocked={isLocked}
                                            />
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* End-of-course HSK exam (admin-chosen). Unlocks after all
                            lessons are passed; must pass it to complete the course. */}
                        {finalExam?.examId && (
                            <div className={`rounded-2xl border p-6 ${
                                finalExam.passed
                                    ? 'border-emerald-500/40 bg-emerald-500/5'
                                    : finalExam.examUnlocked
                                        ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5'
                                        : 'border-[var(--border)] bg-[var(--surface)]'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <Icon
                                        name={finalExam.passed ? 'workspace_premium' : finalExam.examUnlocked ? 'quiz' : 'lock'}
                                        className={finalExam.passed ? 'text-emerald-500' : finalExam.examUnlocked ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-[var(--text-main)]">Bài kiểm tra cuối khóa</h3>
                                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                            {finalExam.exam?.title || `HSK ${finalExam.exam?.hsk_level ?? course.hsk_level}`}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            {finalExam.passed
                                                ? 'Bạn đã đạt bài thi cuối khóa — khóa học đã hoàn thành.'
                                                : finalExam.examUnlocked
                                                    ? 'Đạt ≥ 70% để hoàn thành khóa và mở khóa kế tiếp.'
                                                    : 'Hoàn thành tất cả bài học (mỗi bài ≥ 70%) để mở bài thi này.'}
                                        </p>
                                        <div className="mt-3">
                                            {finalExam.examUnlocked ? (
                                                <Link href={`/hsk-test/${finalExam.examId}`}>
                                                    <Button className={finalExam.passed ? '' : 'bg-[var(--primary)] text-white'} variant={finalExam.passed ? 'secondary' : undefined}>
                                                        <Icon name="play_arrow" size="sm" />
                                                        {finalExam.passed ? 'Làm lại bài thi' : 'Làm bài thi cuối khóa'}
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button disabled variant="secondary">
                                                    <Icon name="lock" size="sm" /> Chưa mở khóa
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Stats Card */}
                        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                                Thông tin khóa học
                            </h3>

                            {/* Progress Ring */}
                            <div className="flex justify-center mb-6">
                                <ProgressRing progress={progress} />
                            </div>

                            {/* Stats Grid */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                                        <Icon name="play_lesson" size="sm" />
                                        Bài học
                                    </span>
                                    <span className="font-semibold text-[var(--text-main)]">{lessons.length} bài</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                                        <Icon name="signal_cellular_alt" size="sm" />
                                        Trình độ
                                    </span>
                                    <span className="font-semibold text-[var(--text-main)]">HSK {course.hsk_level}</span>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                                        <Icon name="group" size="sm" />
                                        Học viên
                                    </span>
                                    <span className="font-semibold text-[var(--text-main)]">1,205</span>
                                </div>
                            </div>

                            {/* CTA Button — priority: in_progress > not_started > first lesson.
                                Logic cũ (`!== 'completed'`) chỉ phân biệt completed/non-completed,
                                bỏ qua việc user đang học dở bài nào → click có thể nhảy lùi về bài 1.
                                Button text dựa vào progress_status THẬT của lesson, không dựa vào
                                course.completed_lessons (chỉ ratio). */}
                            <div className="mt-6">
                                {lessons.length > 0 ? (() => {
                                    // Resume về CHỖ CUỐI đã học:
                                    //   bài đang học dở (in_progress, lấy bài xa nhất)
                                    //   > bài kế ngay sau bài hoàn thành cuối cùng
                                    //   > bài chưa bắt đầu đầu tiên > bài 1
                                    const inProgress = [...lessons].reverse().find(l => l.progress_status === 'in_progress');
                                    const allCompleted = lessons.every(l => l.progress_status === 'completed');
                                    const hasAnyTouched = lessons.some(
                                        l => l.progress_status === 'in_progress' || l.progress_status === 'completed'
                                    );
                                    let lastCompletedIdx = -1;
                                    lessons.forEach((l, i) => { if (l.progress_status === 'completed') lastCompletedIdx = i; });
                                    const afterLastCompleted = (lastCompletedIdx >= 0 && lastCompletedIdx < lessons.length - 1)
                                        ? lessons[lastCompletedIdx + 1] : undefined;
                                    const nextNotStarted = lessons.find(
                                        l => !l.progress_status || l.progress_status === 'not_started'
                                    );
                                    const next = inProgress ?? afterLastCompleted ?? nextNotStarted ?? lessons[0];

                                    const lessonIdx = lessons.findIndex(l => l.id === next.id);
                                    const lessonNo = lessonIdx >= 0 ? lessonIdx + 1 : 1;

                                    let label: string;
                                    let subline: string | null = null;
                                    if (allCompleted) {
                                        label = 'Học lại từ đầu';
                                        subline = 'Bạn đã hoàn thành toàn bộ khóa';
                                    } else if (inProgress) {
                                        label = 'Học tiếp';
                                        subline = `Tiếp tục bài ${lessonNo}: ${next.title}`;
                                    } else if (hasAnyTouched) {
                                        label = 'Học tiếp';
                                        subline = `Bài ${lessonNo}: ${next.title}`;
                                    } else {
                                        label = 'Bắt đầu học';
                                    }

                                    return (
                                        <>
                                            <Link href={`/lessons/${next.id}`} className="block">
                                                <Button fullWidth size="lg" className="justify-center">
                                                    <Icon name="play_arrow" size="sm" className="mr-2" />
                                                    {label}
                                                </Button>
                                            </Link>
                                            {subline && (
                                                <p className="text-xs text-[var(--text-muted)] text-center mt-2 line-clamp-1">
                                                    {subline}
                                                </p>
                                            )}
                                        </>
                                    );
                                })() : (
                                    <Button fullWidth size="lg" disabled variant="secondary" className="justify-center">
                                        Chưa có bài học
                                    </Button>
                                )}
                            </div>

                            {/* Share */}
                            <button className="w-full mt-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center gap-2">
                                <Icon name="share" size="sm" />
                                Chia sẻ khóa học
                            </button>
                        </div>

                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
