'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSKBadge } from '@/components/ui/Badge';
import type { TextbookLessonPayload } from '@/lib/api';
import { PassageTab, type PassageFields } from '@/components/admin/lesson-editor/PassageTab';
import { VocabTab } from '@/components/admin/lesson-editor/VocabTab';
import { GrammarTab } from '@/components/admin/lesson-editor/GrammarTab';
import { WritingTab } from '@/components/admin/lesson-editor/WritingTab';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Tab = 'info' | 'passage' | 'vocab' | 'grammar' | 'writing';

interface InfoFields {
    title: string;
    description: string;
    hsk_level: number;
    order_index: number;
    is_active: number;
}

const TAB_LABELS: Record<Tab, { label: string; icon: string }> = {
    info: { label: 'Tổng quan', icon: 'description' },
    passage: { label: 'Bài khoá', icon: 'article' },
    vocab: { label: 'Từ vựng', icon: 'menu_book' },
    grammar: { label: 'Ngữ pháp', icon: 'auto_stories' },
    writing: { label: 'Bài viết', icon: 'edit_note' },
};

export default function AdminLessonEditorPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = Number(params.id);
    const lessonId = Number(params.lessonId);
    const { token } = useAdminAuth();

    const [tab, setTab] = useState<Tab>('info');
    const [payload, setPayload] = useState<TextbookLessonPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingInfo, setSavingInfo] = useState(false);
    const [savingPassage, setSavingPassage] = useState(false);

    const [info, setInfo] = useState<InfoFields>({
        title: '', description: '', hsk_level: 1, order_index: 0, is_active: 1,
    });
    const [passage, setPassage] = useState<PassageFields>({
        passage_zh: '', passage_pinyin: '', passage_vi: '', passage_audio_url: '', objectives_vi: '',
    });

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            // Raw fetch (not authFetch) so admin token (isAdmin=true) is sent —
            // backend uses that to include soft-deleted lessons.
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/textbook`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const data = json.data as TextbookLessonPayload;
            setPayload(data);
            setInfo({
                title: data.lesson.title || '',
                description: data.lesson.description || '',
                hsk_level: data.lesson.hsk_level || 1,
                order_index: data.lesson.order_index || 0,
                is_active: data.lesson.is_active ? 1 : 0,
            });
            setPassage({
                passage_zh: data.lesson.passage_zh || '',
                passage_pinyin: data.lesson.passage_pinyin || '',
                passage_vi: data.lesson.passage_vi || '',
                passage_audio_url: data.lesson.passage_audio_url || '',
                objectives_vi: data.lesson.objectives_vi || '',
            });
        } catch (e) {
            console.error('Load lesson failed', e);
        } finally {
            setLoading(false);
        }
    }, [lessonId, token]);

    useEffect(() => { load(); }, [load]);

    const saveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingInfo(true);
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(info),
            });
            const data = await res.json();
            if (res.ok) {
                await load();
            } else {
                alert(`Lỗi: ${data.message || 'Không thể lưu'}`);
            }
        } finally {
            setSavingInfo(false);
        }
    };

    const savePassage = async () => {
        setSavingPassage(true);
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/textbook`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    passage_zh: passage.passage_zh.trim() || null,
                    passage_pinyin: passage.passage_pinyin.trim() || null,
                    passage_vi: passage.passage_vi.trim() || null,
                    passage_audio_url: passage.passage_audio_url.trim() || null,
                    objectives_vi: passage.objectives_vi.trim() || null,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                await load();
            } else {
                alert(`Lỗi: ${data.message || 'Không thể lưu bài khoá'}`);
            }
        } finally {
            setSavingPassage(false);
        }
    };

    const deleteLesson = async () => {
        if (!confirm('Ẩn bài học này khỏi user? Bài vẫn còn trong DB và có thể khôi phục bằng cách bật lại "Hoạt động" ở tab Tổng quan.')) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                router.push(`/admin/courses/${courseId}`);
            } else {
                const d = await res.json().catch(() => ({}));
                alert(`Lỗi: ${d.message || 'Không thể xóa'}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20" role="status" aria-busy="true">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
                <span className="sr-only">Đang tải bài học...</span>
            </div>
        );
    }

    if (!payload) {
        return (
            <div className="py-20 text-center">
                <Icon name="error" size="xl" className="text-red-500 mb-3" />
                <p className="text-[var(--text-secondary)] mb-4">Không tìm thấy bài học</p>
                <Link href={`/admin/courses/${courseId}`} className="text-[var(--primary)] hover:underline">
                    ← Quay lại khóa học
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4">
                <Link href="/admin/courses" className="hover:text-[var(--primary)]">Khóa học</Link>
                <Icon name="chevron_right" size="xs" />
                <Link href={`/admin/courses/${courseId}`} className="hover:text-[var(--primary)]">
                    Khóa học #{courseId}
                </Link>
                <Icon name="chevron_right" size="xs" />
                <span className="text-[var(--text-main)] line-clamp-1">{payload.lesson.title}</span>
            </nav>

            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <HSKBadge level={payload.lesson.hsk_level} />
                        {!payload.lesson.is_active && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                Ẩn
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">{payload.lesson.title}</h1>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mt-1">
                        <span><Icon name="menu_book" size="xs" /> {payload.vocabulary.length} từ</span>
                        <span><Icon name="auto_stories" size="xs" /> {payload.grammar.length} ngữ pháp</span>
                        <span><Icon name="edit_note" size="xs" /> {payload.writingExercises.length} bài viết</span>
                    </div>
                </div>
                <button
                    onClick={deleteLesson}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-colors flex items-center gap-1.5"
                >
                    <Icon name="delete" size="sm" />
                    Xóa bài học
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-[var(--border)] mb-6">
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(TAB_LABELS) as Tab[]).map(t => {
                        const meta = TAB_LABELS[t];
                        return (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                                    tab === t
                                        ? 'border-[var(--primary)] text-[var(--primary)]'
                                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                <Icon name={meta.icon} size="xs" />
                                {meta.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab content */}
            {tab === 'info' && (
                <form onSubmit={saveInfo} className="max-w-2xl space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tên bài học *</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                            value={info.title}
                            onChange={e => setInfo({ ...info, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mô tả ngắn</label>
                        <textarea
                            className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-20 resize-none"
                            placeholder="Mô tả ngắn hiển thị trong list bài học"
                            value={info.description}
                            onChange={e => setInfo({ ...info, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">HSK Level</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={info.hsk_level}
                                onChange={e => setInfo({ ...info, hsk_level: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>HSK {n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Thứ tự</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={info.order_index}
                                onChange={e => setInfo({ ...info, order_index: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Trạng thái</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none"
                                value={info.is_active}
                                onChange={e => setInfo({ ...info, is_active: parseInt(e.target.value) })}
                            >
                                <option value={1}>Hoạt động</option>
                                <option value={0}>Ẩn</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" disabled={savingInfo}>
                            <Icon name="save" size="sm" className="mr-1" />
                            {savingInfo ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </form>
            )}

            {tab === 'passage' && (
                <PassageTab
                    value={passage}
                    onChange={setPassage}
                    onSave={savePassage}
                    saving={savingPassage}
                />
            )}

            {tab === 'vocab' && (
                <VocabTab
                    lessonId={lessonId}
                    items={payload.vocabulary}
                    token={token}
                    onChanged={load}
                />
            )}

            {tab === 'grammar' && (
                <GrammarTab
                    lessonId={lessonId}
                    items={payload.grammar}
                    token={token}
                    onChanged={load}
                />
            )}

            {tab === 'writing' && (
                <WritingTab
                    lessonId={lessonId}
                    items={payload.writingExercises}
                    token={token}
                    onChanged={load}
                />
            )}
        </div>
    );
}
