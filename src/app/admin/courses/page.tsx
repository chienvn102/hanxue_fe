'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Course {
    id: number;
    title: string;
    description: string;
    hsk_level: number;
    thumbnail_url: string;
    is_active: number;
    lesson_count: number;
    order_index?: number;
}

export default function AdminCoursesPage() {
    const { token } = useAdminAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        hsk_level: 1,
        thumbnail_url: '',
        order_index: 0
    });

    useEffect(() => {
        if (token) fetchCourses();
    }, [token]);

    const fetchCourses = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/courses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCourses(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCourse(null);
        setFormData({ title: '', description: '', hsk_level: 1, thumbnail_url: '', order_index: 0 });
        setIsModalOpen(true);
    };

    const openEditModal = (course: Course) => {
        setEditingCourse(course);
        setFormData({
            title: course.title,
            description: course.description || '',
            hsk_level: course.hsk_level,
            thumbnail_url: course.thumbnail_url || '',
            order_index: course.order_index || 0
        });
        setIsModalOpen(true);
    };

    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingCourse
                ? `${API_BASE}/api/courses/${editingCourse.id}`
                : `${API_BASE}/api/courses`;
            const method = editingCourse ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingCourse(null);
                fetchCourses();
            } else {
                const data = await res.json();
                alert(`Lỗi: ${data.message || 'Không thể lưu khóa học'}`);
            }
        } catch (error) {
            console.error('Failed to save course:', error);
            alert('Lỗi kết nối server');
        }
    };

    const handleDelete = async (course: Course) => {
        if (!confirm(`Bạn có chắc muốn xóa khóa học "${course.title}"?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/courses/${course.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchCourses();
            } else {
                const data = await res.json();
                alert(`Lỗi: ${data.message || 'Không thể xóa khóa học'}`);
            }
        } catch (error) {
            console.error('Failed to delete course:', error);
            alert('Lỗi kết nối server');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Quản lý Khóa học</h1>
                    <p className="text-[var(--text-muted)] mt-1">Tổng cộng {courses.length} khóa học</p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm Khóa học
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Đang tải danh sách...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div key={course.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="h-40 bg-[var(--surface-secondary)] relative">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                        <Icon name="image" size="lg" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 text-white text-xs font-bold rounded-md backdrop-blur-md">
                                    HSK {course.hsk_level}
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-lg text-[var(--text-main)] mb-2 truncate" title={course.title}>{course.title}</h3>
                                <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4 h-10">{course.description}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                                        {course.lesson_count} Bài học
                                    </span>
                                    <div className="flex gap-2">
                                        <Link href={`/admin/courses/${course.id}/lessons`}>
                                            <button className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" title="Quản lý bài học">
                                                <Icon name="list" size="sm" />
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => openEditModal(course)}
                                            className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                                            title="Chỉnh sửa"
                                        >
                                            <Icon name="edit" size="sm" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(course)}
                                            className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                            title="Xóa"
                                        >
                                            <Icon name="delete" size="sm" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--surface)] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[var(--text-main)]">
                                {editingCourse ? 'Chỉnh sửa Khóa học' : 'Tạo Khóa học Mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                <Icon name="close" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tên khóa học</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Cấp độ HSK</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.hsk_level}
                                        onChange={e => setFormData({ ...formData, hsk_level: parseInt(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                            <option key={num} value={num}>HSK {num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Thứ tự sắp xếp</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.order_index}
                                        onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mô tả</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all resize-none h-24"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link ảnh bìa</label>
                                <input
                                    type="url"
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                    placeholder="https://"
                                    value={formData.thumbnail_url}
                                    onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">
                                    Hủy
                                </Button>
                                <Button type="submit" className="flex-1">
                                    {editingCourse ? 'Lưu thay đổi' : 'Tạo'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
