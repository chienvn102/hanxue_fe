'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Lesson {
    id: number;
    title: string;
    description: string | null;
    hsk_level: number | null;
    order_index: number;
    is_active: number;
    passage_audio_url: string | null;
}

interface Course {
    id: number;
    title: string;
    hsk_level: number;
}

export default function AdminLessonsPage() {
    const { token } = useAdminAuth();
    const params = useParams();
    const courseId = params.id;

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        hskLevel: 1,
        orderIndex: 0,
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [courseRes, lessonsRes] = await Promise.all([
                fetch(`${API_BASE}/api/courses/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_BASE}/api/lessons/course/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            const courseData = await courseRes.json();
            if (courseData.success) {
                setCourse(courseData.data);
                setFormData(prev => ({ ...prev, hskLevel: courseData.data.hsk_level || 1 }));
            }
            const lessonsData = await lessonsRes.json();
            if (lessonsData.success) {
                setLessons(lessonsData.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [courseId, token]);

    useEffect(() => {
        if (courseId && token) fetchData();
    }, [courseId, token, fetchData]);

    const openCreateModal = () => {
        setFormData({
            title: '',
            description: '',
            hskLevel: course?.hsk_level || 1,
            orderIndex: lessons.length + 1,
        });
        setIsModalOpen(true);
    };

    const handleCreateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        try {
            setSubmitting(true);
            const res = await fetch(`${API_BASE}/api/lessons/textbook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    courseId: Number(courseId),
                    title: formData.title.trim(),
                    description: formData.description.trim() || null,
                    hskLevel: formData.hskLevel,
                    orderIndex: formData.orderIndex,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                await fetchData();
            } else {
                alert(data.message || 'Tạo bài học thất bại');
            }
        } catch (error) {
            console.error('Failed to create lesson:', error);
            alert('Lỗi mạng khi tạo bài học');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLesson = async (lesson: Lesson) => {
        if (!confirm(`Xoá bài "${lesson.title}"?\n(Soft delete — set is_active=FALSE)`)) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lesson.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                await fetchData();
            } else {
                alert(data.message || 'Xoá thất bại');
            }
        } catch (error) {
            console.error('Failed to delete lesson:', error);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/courses" className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] transition-colors">
                    <Icon name="arrow_back" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">
                        {course ? `Bài học: ${course.title}` : 'Quản lý Bài học'}
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">
                        Bài học textbook (passage + vocab + ngữ pháp + bài viết).
                    </p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm Bài học
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Đang tải danh sách bài học...</div>
            ) : lessons.length === 0 ? (
                <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-[var(--border)] border-dashed">
                    <p className="text-[var(--text-muted)]">Chưa có bài học nào trong khóa này.</p>
                </div>
            ) : (
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--background)] border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="px-6 py-4">STT</th>
                                <th className="px-6 py-4">Tiêu đề</th>
                                <th className="px-6 py-4 text-center">HSK</th>
                                <th className="px-6 py-4 text-center">Audio</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {lessons.map(lesson => (
                                <tr key={lesson.id} className="hover:bg-[var(--background)] transition-colors">
                                    <td className="px-6 py-4 text-[var(--text-muted)]">#{lesson.order_index}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-[var(--text-main)]">{lesson.title}</div>
                                        {lesson.description && (
                                            <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{lesson.description}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                                            HSK {lesson.hsk_level || '?'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {lesson.passage_audio_url ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                                                <Icon name="check_circle" size="xs" /> Có
                                            </span>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {lesson.is_active ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">Active</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-secondary)] text-[var(--text-muted)]">Inactive</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/lessons/${lesson.id}/editor`}>
                                                <Button size="sm" variant="outline" className="flex items-center gap-2">
                                                    <Icon name="edit_note" size="sm" />
                                                    Soạn thảo
                                                </Button>
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteLesson(lesson)}
                                                className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                                title="Xoá bài học"
                                            >
                                                <Icon name="delete" size="sm" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--surface)] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[var(--text-main)]">Thêm Bài học Mới</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                <Icon name="close" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateLesson} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tiêu đề</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: HSK1 — Bài 2: Gia đình"
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mô tả ngắn (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Mô tả nội dung chính / chủ đề bài học"
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">HSK Level</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                        value={formData.hskLevel}
                                        onChange={e => setFormData({ ...formData, hskLevel: parseInt(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(lv => (
                                            <option key={lv} value={lv}>HSK {lv}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Thứ tự</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.orderIndex}
                                        onChange={e => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-[var(--text-muted)] bg-[var(--background)] p-3 rounded-lg">
                                Sau khi tạo, bấm <strong>Soạn thảo</strong> để thêm passage / từ vựng / ngữ pháp / bài tập viết.
                            </p>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={submitting || !formData.title.trim()} className="flex-1">
                                    {submitting ? 'Đang tạo...' : 'Tạo Bài học'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
