'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Course {
    id: number;
    title: string;
    description: string;
    hsk_level: number;
    is_active: number | boolean;
    order_index: number;
    lesson_count?: number;
}

interface LessonItem {
    id: number;
    title: string;
    description: string | null;
    order_index: number;
    hsk_level: number;
    is_active?: number | boolean;
    objectives_vi?: string | null;
    passage_zh?: string | null;
}

type Tab = 'info' | 'lessons';

export default function AdminCourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = Number(params.id);
    const { token } = useAdminAuth();

    // Default to "lessons" — admin chỉ vào trang detail từ list để quản lý lessons.
    // Edit metadata trực tiếp ở list modal cũng được.
    const [tab, setTab] = useState<Tab>('lessons');
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<LessonItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: '', description: '', hsk_level: 1,
        order_index: 0, is_active: 1,
    });

    const [showAddLesson, setShowAddLesson] = useState(false);
    const [newLesson, setNewLesson] = useState({ title: '', order_index: 0, hsk_level: 1 });

    // Kéo-thả sắp xếp lại bài học.
    const [dragId, setDragId] = useState<number | null>(null);
    const [overId, setOverId] = useState<number | null>(null);
    const [reordering, setReordering] = useState(false);

    // Sau lesson cuối hiện có. Khi list trống → 0; ngược lại → max(order_index)+1.
    // Tránh off-by-one khi list không liên tục từ 0 (vd: 0,1,5).
    const nextOrderIndex = (list: { order_index: number }[]) =>
        list.length === 0 ? 0 : Math.max(...list.map(l => l.order_index)) + 1;

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [courseRes, lessonsRes] = await Promise.all([
                fetch(`${API_BASE}/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/lessons/course/${courseId}?include_inactive=1`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const cd = await courseRes.json();
            const ld = await lessonsRes.json();
            if (cd.success) {
                setCourse(cd.data);
                setForm({
                    title: cd.data.title || '',
                    description: cd.data.description || '',
                    hsk_level: cd.data.hsk_level || 1,
                    order_index: cd.data.order_index || 0,
                    is_active: cd.data.is_active ? 1 : 0,
                });
                setNewLesson(s => ({ ...s, hsk_level: cd.data.hsk_level || 1 }));
            }
            if (ld.success) setLessons(ld.data || []);
        } catch (e) {
            console.error('Load failed', e);
        } finally {
            setLoading(false);
        }
    }, [token, courseId]);

    useEffect(() => { load(); }, [load]);

    const saveCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                await load();
            } else {
                alert(`Lỗi: ${data.message || 'Không thể lưu khóa học'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối server');
        } finally {
            setSaving(false);
        }
    };

    const createLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/api/lessons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    course_id: courseId,
                    title: newLesson.title,
                    order_index: newLesson.order_index,
                    hsk_level: newLesson.hsk_level,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setShowAddLesson(false);
                // Reset form — order_index sẽ được tính lại từ lessons mới khi mở modal lần kế.
                setNewLesson({ title: '', order_index: 0, hsk_level: course?.hsk_level || 1 });
                await load();
                if (data.data?.id) {
                    router.push(`/admin/courses/${courseId}/lessons/${data.data.id}`);
                }
            } else {
                alert(`Lỗi: ${data.message || 'Không thể tạo bài học'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối server');
        }
    };

    const deleteLesson = async (lesson: LessonItem) => {
        if (!confirm(`Ẩn bài "${lesson.title}"? Bài vẫn ở trong DB, có thể khôi phục bằng cách bật lại "Hoạt động" trong trang chỉnh sửa bài.`)) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lesson.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                await load();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(`Lỗi: ${data.message || 'Không thể xóa'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối server');
        }
    };

    // Thả 1 bài lên vị trí của bài khác → chèn lại + đánh số order_index 0..N theo
    // thứ tự mới, rồi persist các bài thay đổi qua PUT /api/lessons/:id.
    const handleDrop = async (targetId: number) => {
        const fromId = dragId;
        setDragId(null);
        setOverId(null);
        if (fromId == null || fromId === targetId) return;

        const ordered = [...lessons].sort((a, b) => a.order_index - b.order_index);
        const from = ordered.findIndex(l => l.id === fromId);
        const to = ordered.findIndex(l => l.id === targetId);
        if (from < 0 || to < 0) return;

        const oldOrder = new Map(ordered.map(l => [l.id, l.order_index]));
        const [moved] = ordered.splice(from, 1);
        ordered.splice(to, 0, moved);
        const renumbered = ordered.map((l, i) => ({ ...l, order_index: i }));

        setLessons(renumbered); // optimistic
        const changed = renumbered.filter(l => oldOrder.get(l.id) !== l.order_index);
        if (changed.length === 0) return;

        setReordering(true);
        try {
            const results = await Promise.all(changed.map(l =>
                fetch(`${API_BASE}/api/lessons/${l.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ order_index: l.order_index }),
                })
            ));
            if (results.some(r => !r.ok)) throw new Error('reorder failed');
            await load();
        } catch (e) {
            console.error('Reorder failed', e);
            alert('Lỗi sắp xếp — tải lại danh sách.');
            await load(); // rollback về trạng thái DB
        } finally {
            setReordering(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20" role="status" aria-busy="true">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
                <span className="sr-only">Đang tải khóa học...</span>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="py-20 text-center">
                <Icon name="error" size="xl" className="text-red-500 mb-3" />
                <p className="text-[var(--text-secondary)] mb-4">Không tìm thấy khóa học</p>
                <Link href="/admin/courses" className="text-[var(--primary)] hover:underline">← Quay lại danh sách</Link>
            </div>
        );
    }

    return (
        <div>
            {/* Breadcrumb + title */}
            <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4">
                <Link href="/admin/courses" className="hover:text-[var(--primary)]">Khóa học</Link>
                <Icon name="chevron_right" size="xs" />
                <span className="text-[var(--text-main)] line-clamp-1">{course.title}</span>
            </nav>

            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <HSKBadge level={course.hsk_level} />
                        {!course.is_active && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                Ẩn
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">{course.title}</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{lessons.length} bài học</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[var(--border)] mb-6">
                <div className="flex gap-2">
                    {(['info', 'lessons'] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                tab === t
                                    ? 'border-[var(--primary)] text-[var(--primary)]'
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            {t === 'info' ? 'Thông tin' : `Bài học (${lessons.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Info tab */}
            {tab === 'info' && (
                <form onSubmit={saveCourse} className="max-w-2xl space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tên khóa học</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Cấp độ HSK</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={form.hsk_level}
                                onChange={e => setForm({ ...form, hsk_level: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>HSK {n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Thứ tự</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={form.order_index}
                                onChange={e => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Trạng thái</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={form.is_active}
                                onChange={e => setForm({ ...form, is_active: parseInt(e.target.value) })}
                            >
                                <option value={1}>Hoạt động</option>
                                <option value={0}>Ẩn</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mô tả</label>
                        <textarea
                            className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-24 resize-none"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                        <Link href="/admin/courses">
                            <Button type="button" variant="ghost">Hủy</Button>
                        </Link>
                    </div>
                </form>
            )}

            {/* Lessons tab */}
            {tab === 'lessons' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
                            <Icon name="drag_indicator" size="sm" />
                            Kéo-thả để đổi thứ tự bài học{reordering && <span className="text-[var(--primary)]">· đang lưu…</span>}
                        </p>
                        <Button onClick={() => { setNewLesson({ title: '', order_index: nextOrderIndex(lessons), hsk_level: course.hsk_level }); setShowAddLesson(true); }} className="flex items-center gap-1.5">
                            <Icon name="add" size="sm" />
                            Thêm bài học
                        </Button>
                    </div>

                    {lessons.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-xl">
                            <Icon name="menu_book" size="xl" className="text-[var(--text-muted)] mb-2" />
                            <p className="text-[var(--text-secondary)] mb-3">Chưa có bài học nào</p>
                            <Button onClick={() => { setNewLesson({ title: '', order_index: nextOrderIndex(lessons), hsk_level: course.hsk_level }); setShowAddLesson(true); }} variant="ghost">
                                Tạo bài học đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[...lessons].sort((a, b) => a.order_index - b.order_index).map((lesson, idx) => (
                                <div
                                    key={lesson.id}
                                    draggable
                                    onDragStart={() => setDragId(lesson.id)}
                                    onDragOver={(e) => { e.preventDefault(); if (overId !== lesson.id) setOverId(lesson.id); }}
                                    onDragLeave={() => setOverId(o => (o === lesson.id ? null : o))}
                                    onDrop={(e) => { e.preventDefault(); handleDrop(lesson.id); }}
                                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                                    className={`flex items-center gap-3 p-4 bg-[var(--surface)] border rounded-xl transition-colors ${
                                        overId === lesson.id && dragId !== lesson.id
                                            ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20'
                                            : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                                    } ${dragId === lesson.id ? 'opacity-50' : ''}`}
                                >
                                    <span className="cursor-grab active:cursor-grabbing text-[var(--text-muted)] shrink-0" title="Kéo để sắp xếp">
                                        <Icon name="drag_indicator" size="sm" />
                                    </span>
                                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center text-sm font-bold text-[var(--text-muted)] shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[var(--text-main)] truncate">{lesson.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <HSKBadge level={lesson.hsk_level} />
                                            {lesson.passage_zh && (
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    <Icon name="article" size="xs" /> Có bài khoá
                                                </span>
                                            )}
                                            {!lesson.is_active && (
                                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">Ẩn</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>
                                            <button className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" title="Sửa nội dung">
                                                <Icon name="edit" size="sm" />
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => deleteLesson(lesson)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                            title="Xóa"
                                        >
                                            <Icon name="delete" size="sm" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add lesson modal */}
            {showAddLesson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--surface)] rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[var(--text-main)]">Thêm bài học</h2>
                            <button onClick={() => setShowAddLesson(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                <Icon name="close" />
                            </button>
                        </div>
                        <form onSubmit={createLesson} className="p-6 space-y-4">
                            <p className="text-xs text-[var(--text-muted)]">
                                Tạo nhanh bài học. Sau khi tạo bạn sẽ vào trang chỉnh sửa chi tiết để thêm bài khoá, từ vựng, ngữ pháp, bài viết.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tên bài học</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                    value={newLesson.title}
                                    onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                                    placeholder="VD: Bài 1 — Chào hỏi"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--surface-secondary)] rounded-lg px-3 py-2">
                                <Icon name="info" size="sm" />
                                <span>
                                    Bài số <strong className="text-[var(--text-main)]">#{lessons.length + 1}</strong>,
                                    cấp <strong className="text-[var(--text-main)]">HSK {course.hsk_level}</strong> (tự động).
                                    Đổi thứ tự bằng kéo-thả ở danh sách sau khi tạo.
                                </span>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowAddLesson(false)} className="flex-1">Hủy</Button>
                                <Button type="submit" className="flex-1">Tạo &amp; mở chỉnh sửa</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
