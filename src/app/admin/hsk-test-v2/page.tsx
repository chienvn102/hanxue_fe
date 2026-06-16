'use client';

/**
 * HSK Test v2 — trang quản lý đề thi "builder mới" (format_version = 2).
 *
 * Tách RIÊNG khỏi /admin/hsk-test (v1) để khi v2 ổn định có thể ẩn menu v1.
 * Đề v2: format cố định theo template HSK (admin chỉ sửa nội dung + đáp án),
 * 1 file audio cho cả đề. Tạo mới luôn đi qua template → không soạn structure tay.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSK_COLORS, HSK_SECTION_PRESETS } from '@/components/admin/hsk-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
// HSK1-3 đã có blueprint chuẩn (đề thật + đáp án). HSK4-6 bổ sung sau.
const V2_LEVELS = [1, 2, 3];

interface ExamV2 {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: string;
    total_questions: number;
    is_active: number | boolean;
    audio_url?: string | null;
}

export default function HskTestV2Page() {
    const router = useRouter();
    const [exams, setExams] = useState<ExamV2[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [seedContent, setSeedContent] = useState(true); // tạo kèm nội dung mẫu (đề thật)

    const token = () => (typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null);

    const fetchExams = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/hsk-exams?format_version=2&limit=100`, {
                headers: { Authorization: `Bearer ${token() || ''}` },
            });
            const data = await res.json();
            setExams(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            console.error('Fetch v2 exams error:', err);
            setExams([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const createExam = async (level: number) => {
        try {
            setCreating(true);
            const res = await fetch(`${API_BASE}/api/hsk-exams/from-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() || ''}` },
                body: JSON.stringify({ level, seed: seedContent }),
            });
            const data = await res.json();
            if (!res.ok || !data?.data?.id) {
                alert(data?.message || 'Tạo đề thất bại');
                return;
            }
            router.push(`/admin/hsk-test-v2/${data.data.id}`);
        } catch (err) {
            console.error('Create v2 exam error:', err);
            alert('Lỗi mạng khi tạo đề');
        } finally {
            setCreating(false);
        }
    };

    const toggleActive = async (exam: ExamV2) => {
        try {
            await fetch(`${API_BASE}/api/hsk-exams/${exam.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() || ''}` },
                body: JSON.stringify({ is_active: exam.is_active ? 0 : 1 }),
            });
            fetchExams();
        } catch (err) {
            console.error('Toggle active error:', err);
        }
    };

    const deleteExam = async (exam: ExamV2) => {
        if (!confirm(`Xoá đề "${exam.title}"? Hành động này không hoàn tác.`)) return;
        try {
            await fetch(`${API_BASE}/api/hsk-exams/${exam.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token() || ''}` },
            });
            fetchExams();
        } catch (err) {
            console.error('Delete exam error:', err);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Icon name="assignment" /> Đề thi HSK (v2)
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Format khóa theo chuẩn HSK · chỉ sửa nội dung + đáp án · 1 file audio/đề.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/hsk-test/import?v2=1"
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                        <Icon name="upload_file" size="sm" /> Import OCR v2
                    </Link>
                    <Button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5">
                        <Icon name="add" size="sm" /> Tạo đề v2
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16 text-[var(--text-muted)]">Đang tải...</div>
            ) : exams.length === 0 ? (
                <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-dashed border-[var(--border)]">
                    <Icon name="assignment" size="xl" className="text-[var(--text-muted)] mb-3" />
                    <p className="text-[var(--text-secondary)] mb-4">Chưa có đề v2 nào. Tạo đề đầu tiên từ template chuẩn.</p>
                    <Button onClick={() => setShowCreate(true)}><Icon name="add" size="sm" /> Tạo đề v2</Button>
                </div>
            ) : (
                <ul className="space-y-2">
                    {exams.map(exam => (
                        <li
                            key={exam.id}
                            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] px-4 py-3 flex items-center gap-3"
                        >
                            <span className={`${HSK_COLORS[exam.hsk_level]} text-white text-xs font-bold px-2 py-1 rounded shrink-0`}>
                                HSK {exam.hsk_level}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[var(--text-main)] truncate">{exam.title}</p>
                                <p className="text-xs text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
                                    <span>{exam.total_questions} câu</span>
                                    <span>· {exam.exam_type === 'exam' ? 'Thi' : 'Luyện tập'}</span>
                                    <span className={exam.audio_url ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                        · {exam.audio_url ? 'có audio đề' : 'chưa có audio'}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => toggleActive(exam)}
                                className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${exam.is_active
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'}`}
                                title="Bật/tắt hiển thị cho người dùng"
                            >
                                {exam.is_active ? 'Đang hoạt động' : 'Đã ẩn'}
                            </button>
                            <Link
                                href={`/admin/hsk-test-v2/${exam.id}`}
                                className="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 shrink-0 inline-flex items-center gap-1"
                            >
                                <Icon name="edit" size="xs" /> Sửa
                            </Link>
                            <button
                                onClick={() => deleteExam(exam)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-red-500 shrink-0"
                                title="Xoá đề"
                            >
                                <Icon name="delete" size="sm" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !creating && setShowCreate(false)}>
                    <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[var(--text-main)]">Tạo đề v2 — chọn cấp HSK</h3>
                            <button onClick={() => !creating && setShowCreate(false)} className="text-[var(--text-muted)]">
                                <Icon name="close" size="sm" />
                            </button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-3">
                            Đề dựng sẵn ĐÚNG format chuẩn của cấp (số đáp án, lưới ảnh A–F/A–E, ngân hàng từ/câu).
                        </p>
                        <label className="flex items-start gap-2 mb-4 text-sm cursor-pointer p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                            <input type="checkbox" checked={seedContent} onChange={e => setSeedContent(e.target.checked)} className="w-4 h-4 mt-0.5" />
                            <span className="text-[var(--text-main)]">Tạo kèm <b>nội dung mẫu</b> (đề thật có sẵn câu hỏi/đáp án/ngân hàng — chỉ cần upload 1 audio). Bỏ chọn = đề trống tự nhập.</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {V2_LEVELS.map(level => {
                                const preset = HSK_SECTION_PRESETS[level] || [];
                                const total = preset.reduce((s, p) => s + p.total_questions, 0);
                                return (
                                    <button
                                        key={level}
                                        disabled={creating}
                                        onClick={() => createExam(level)}
                                        className="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 text-left disabled:opacity-50 transition-colors"
                                    >
                                        <span className={`${HSK_COLORS[level]} text-white text-xs font-bold px-2 py-1 rounded`}>HSK {level}</span>
                                        <p className="text-xs text-[var(--text-muted)] mt-2">{total} câu · {preset.length} phần</p>
                                    </button>
                                );
                            })}
                        </div>
                        {creating && <p className="text-sm text-[var(--text-muted)] mt-4 text-center">Đang tạo đề...</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
