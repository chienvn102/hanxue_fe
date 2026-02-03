'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Lesson {
    id: number;
    title: string;
    youtube_id: string;
    duration: number;
    order_index: number;
    is_active: number;
    content_count: number;
    question_count: number;
}

interface Course {
    id: number;
    title: string;
}

export default function AdminLessonsPage() {
    const { token } = useAdminAuth();
    const params = useParams();
    const router = useRouter();
    const courseId = params.id;

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form data for creating a new lesson
    const [formData, setFormData] = useState({
        title: '',
        youtube_id: '',
        duration: 0,
        order_index: 0
    });

    useEffect(() => {
        if (courseId && token) {
            fetchData();
        }
    }, [courseId, token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch course details
            const courseRes = await fetch(`${API_BASE}/api/courses/${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const courseData = await courseRes.json();
            if (courseData.success) {
                setCourse(courseData.data);
            }

            // Fetch lessons
            const lessonsRes = await fetch(`${API_BASE}/api/lessons/course/${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const lessonsData = await lessonsRes.json();
            if (lessonsData.success) {
                setLessons(lessonsData.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/api/lessons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    course_id: courseId
                })
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                setFormData({ title: '', youtube_id: '', duration: 0, order_index: lessons.length + 1 });
                fetchData(); // Refresh list
            } else {
                alert(data.message || 'Failed to create lesson');
            }
        } catch (error) {
            console.error('Failed to create lesson:', error);
        }
    };

    // YouTube Duration Fetcher Logic
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
    }, []);

    const fetchVideoDuration = (videoId: string) => {
        if (!videoId || videoId.length !== 11) return;

        // Create a hidden div for the player if it doesn't exist
        let playerDiv = document.getElementById('temp-player-div');
        if (!playerDiv) {
            playerDiv = document.createElement('div');
            playerDiv.id = 'temp-player-div';
            playerDiv.style.display = 'none';
            document.body.appendChild(playerDiv);
        }

        // Initialize player
        const player = new window.YT.Player('temp-player-div', {
            videoId: videoId,
            events: {
                'onReady': (event: any) => {
                    const duration = event.target.getDuration();
                    if (duration > 0) {
                        setFormData(prev => ({ ...prev, duration: Math.floor(duration) }));
                    }
                    event.target.destroy();
                }
            }
        });
    };

    // Watch for youtube_id changes to fetch duration
    useEffect(() => {
        if (formData.youtube_id && formData.youtube_id.length === 11) {
            if (window.YT && window.YT.Player) {
                fetchVideoDuration(formData.youtube_id);
            } else {
                // Wait for API to be ready
                window.onYouTubeIframeAPIReady = () => fetchVideoDuration(formData.youtube_id);
            }
        }
    }, [formData.youtube_id]);

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/courses" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    <Icon name="arrow_back" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {course ? `Bài học: ${course.title}` : 'Quản lý Bài học'}
                    </h1>
                    <p className="text-gray-500 mt-1">Danh sách bài học video trong khóa</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm Bài học
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Đang tải danh sách bài học...</div>
            ) : lessons.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                    <p className="text-gray-500">Chưa có bài học nào trong khóa này.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4">STT</th>
                                <th className="px-6 py-4">Tiêu đề</th>
                                <th className="px-6 py-4">Video ID</th>
                                <th className="px-6 py-4">Thời lượng</th>
                                <th className="px-6 py-4 text-center">Nội dung</th>
                                <th className="px-6 py-4 text-center">Câu hỏi</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lessons.map((lesson) => (
                                <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500">#{lesson.order_index}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{lesson.title}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-blue-600 bg-blue-50 py-1 px-2 rounded w-fit">
                                        {lesson.youtube_id}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{Math.floor(lesson.duration / 60)} phút</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {lesson.content_count || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            {lesson.question_count || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/lessons/${lesson.id}/editor`}>
                                                <Button size="sm" variant="outline" className="flex items-center gap-2">
                                                    <Icon name="edit_note" size="sm" />
                                                    Soạn thảo
                                                </Button>
                                            </Link>
                                            <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
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

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Thêm Bài học Mới</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Icon name="close" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateLesson} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề bài học</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video URL / ID</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Paste YouTube Link or ID"
                                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-mono focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.youtube_id}
                                        onChange={e => {
                                            const val = e.target.value;
                                            let id = val;
                                            try {
                                                if (val.includes('youtube.com/watch')) {
                                                    const urlParams = new URLSearchParams(val.split('?')[1]);
                                                    id = urlParams.get('v') || val;
                                                } else if (val.includes('youtu.be/')) {
                                                    id = val.split('youtu.be/')[1].split('?')[0];
                                                }
                                            } catch (err) {
                                                console.log('Error parsing URL', err);
                                            }
                                            setFormData({ ...formData, youtube_id: id });
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Hỗ trợ link đầy đủ (ví dụ: https://www.youtube.com/watch?v=...) hoặc ID</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (giây)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Tự động lấy khi nhập đúng YouTube ID</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                                        value={formData.order_index}
                                        onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">
                                    Hủy
                                </Button>
                                <Button type="submit" className="flex-1">
                                    Tạo Bài học
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
