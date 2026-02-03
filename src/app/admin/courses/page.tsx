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
}

export default function AdminCoursesPage() {
    const { token } = useAdminAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        hsk_level: 1,
        thumbnail_url: '',
        order_index: 0
    });

    useEffect(() => {
        fetchCourses();
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

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/api/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ title: '', description: '', hsk_level: 1, thumbnail_url: '', order_index: 0 });
                fetchCourses(); // Refresh list
            } else {
                const data = await res.json();
                alert(`Lỗi: ${data.message}`);
                console.error('Create failed:', data);
            }
        } catch (error) {
            console.error('Failed to create course:', error);
            alert('Lỗi kết nối server');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Khóa học</h1>
                    <p className="text-gray-500 mt-1">Quản lý khóa học HSK và hệ thống bài giảng</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm Khóa học
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Đang tải danh sách...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div key={course.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="h-40 bg-gray-100 relative">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Icon name="image" size="lg" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 text-white text-xs font-bold rounded-md backdrop-blur-md">
                                    HSK {course.hsk_level}
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-lg text-gray-900 mb-2 truncate" title={course.title}>{course.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{course.description}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <span className="text-xs font-semibold text-gray-400 uppercase">
                                        {course.lesson_count} Bài học
                                    </span>
                                    <div className="flex gap-2">
                                        <Link href={`/admin/courses/${course.id}/lessons`}>
                                            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[var(--primary)] transition-colors" title="Quản lý bài học">
                                                <Icon name="list" size="sm" />
                                            </button>
                                        </Link>
                                        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[var(--primary)] transition-colors" title="Chỉnh sửa">
                                            <Icon name="edit" size="sm" />
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors" title="Xóa">
                                            <Icon name="delete" size="sm" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Tạo Khóa học Mới</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Icon name="close" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khóa học</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cấp độ HSK</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.hsk_level}
                                        onChange={e => setFormData({ ...formData, hsk_level: parseInt(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                            <option key={num} value={num}>HSK {num}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự sắp xếp</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.order_index}
                                        onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all resize-none h-24"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link ảnh bìa</label>
                                <input
                                    type="url"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
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
                                    Tạo
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
