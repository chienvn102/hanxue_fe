'use client';

/**
 * Trang chi tiết đề thi HSK cho admin (LOCKED FORMAT mode).
 *
 * Khác trang list (/admin/hsk-test) ở chỗ:
 * - Format đề (sections / groups / question_type / question_number) ĐƯỢC KHÓA
 *   theo template HSK đã chọn lúc tạo đề. Admin không thể thêm/xóa section,
 *   không thể đổi question_type.
 * - Admin chỉ sửa được NỘI DUNG từng câu (question_text, options, đáp án,
 *   audio, transcript, explanation, points).
 *
 * Lý do: yêu cầu của user — tránh để admin xóa nhầm structure khi chỉ muốn
 * cập nhật nội dung. Trang list cũ vẫn dùng cho create/delete đề.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { QuestionFormByType } from '@/components/admin/QuestionFormByType';
import {
    HSK_COLORS, SECTION_TYPES, QUESTION_TYPES,
    DEFAULT_QUESTION_FORM,
    type QuestionFormData,
} from '@/components/admin/hsk-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface Question {
    id: number;
    section_id: number;
    group_id?: number | null;
    question_number: number;
    question_type: string;
    question_text: string;
    passage?: string;
    statement?: string;
    question_image: string;
    question_audio: string;
    transcript?: string;
    audio_start_time: number;
    audio_end_time: number;
    audio_play_count: number;
    options: string[];
    options_pinyin?: string[];
    option_images: string[];
    correct_answer: string;
    explanation: string;
    difficulty: number;
    points: number;
    meta?: Record<string, unknown> | null;
}

interface Section {
    id: number;
    section_type: string;
    section_order: number;
    title: string;
    instructions: string;
    audio_url?: string;
    questions?: Question[];
}

interface ExamDetail {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: string;
    duration_minutes: number;
    passing_score: number;
    description?: string;
    sections: Section[];
}

interface FlatQuestion extends Question {
    section_index: number;
    section_type: string;
    section_title: string;
    global_index: number;
}

function flattenQuestions(sections: Section[]): FlatQuestion[] {
    const out: FlatQuestion[] = [];
    sections.forEach((s, sIdx) => {
        (s.questions || []).forEach(q => {
            out.push({
                ...q,
                section_index: sIdx,
                section_type: s.section_type,
                section_title: s.title || `Phần ${s.section_order}`,
                global_index: out.length,
            });
        });
    });
    return out;
}

export default function HskExamDetailAdminPage() {
    const params = useParams();
    const examId = Number(params.examId);

    const [exam, setExam] = useState<ExamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Sửa nội dung 1 câu — modal inline. selectedQuestion chứa cả section_type
    // gốc để truyền vào QuestionFormByType (locked, không cho đổi).
    const [editing, setEditing] = useState<FlatQuestion | null>(null);
    const [editForm, setEditForm] = useState<QuestionFormData>({ ...DEFAULT_QUESTION_FORM });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const fetchExam = useCallback(async () => {
        if (!examId) return;
        setLoading(true);
        setError('');
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
            const res = await fetch(`${API_BASE}/api/hsk-exams/${examId}`, {
                headers: { Authorization: `Bearer ${token || ''}` },
            });
            if (!res.ok) throw new Error('Không tải được đề thi');
            const data = await res.json();
            setExam(data as ExamDetail);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi tải đề thi');
        } finally {
            setLoading(false);
        }
    }, [examId]);

    useEffect(() => {
        fetchExam();
    }, [fetchExam]);

    const flatQuestions = useMemo(
        () => (exam ? flattenQuestions(exam.sections) : []),
        [exam],
    );

    const openEdit = (q: FlatQuestion) => {
        setEditing(q);
        setSaveError('');
        setEditForm({
            question_number: q.question_number,
            question_type: q.question_type,
            question_text: q.question_text || '',
            passage: q.passage || '',
            statement: q.statement || '',
            question_image: q.question_image || '',
            question_audio: q.question_audio || '',
            transcript: q.transcript || '',
            audio_start_time: q.audio_start_time || 0,
            audio_end_time: q.audio_end_time || 0,
            audio_play_count: q.audio_play_count || 2,
            options: (q.options && q.options.length >= 3) ? q.options : ['', '', '', ''],
            options_pinyin: q.options_pinyin || ['', '', '', ''],
            option_images: (q.option_images && q.option_images.length >= 3) ? q.option_images : ['', '', '', ''],
            correct_answer: q.correct_answer || '',
            explanation: q.explanation || '',
            difficulty: q.difficulty || 1,
            points: q.points || 1,
            group_id: q.group_id ?? null,
            meta: q.meta || null,
        });
    };

    const handleSave = async () => {
        if (!editing) return;
        setSaving(true);
        setSaveError('');
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
            // LOCK: KHÔNG gửi question_type, question_number, group_id (giữ nguyên cấu trúc).
            // Chỉ gửi các field nội dung được phép sửa.
            const payload = {
                question_text: editForm.question_text,
                passage: editForm.passage,
                statement: editForm.statement,
                question_image: editForm.question_image,
                question_audio: editForm.question_audio,
                transcript: editForm.transcript,
                audio_start_time: editForm.audio_start_time,
                audio_end_time: editForm.audio_end_time,
                audio_play_count: editForm.audio_play_count,
                options: editForm.options,
                options_pinyin: editForm.options_pinyin,
                option_images: editForm.option_images,
                correct_answer: editForm.correct_answer,
                explanation: editForm.explanation,
                difficulty: editForm.difficulty,
                points: editForm.points,
                meta: editForm.meta,
            };
            const res = await fetch(`${API_BASE}/api/hsk-exams/questions/${editing.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || ''}`,
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.message || 'Lưu thất bại');
            }
            setEditing(null);
            await fetchExam();
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Lưu thất bại');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12 text-[var(--text-muted)]">Đang tải đề thi...</div>
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <Icon name="error" size="xl" className="text-red-500 mb-3" />
                    <p className="text-[var(--text-secondary)] mb-4">{error || 'Không tìm thấy đề thi'}</p>
                    <Link href="/admin/hsk-test">
                        <Button variant="secondary"><Icon name="arrow_back" size="sm" /> Quay lại</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Link
                    href="/admin/hsk-test"
                    className="text-[var(--text-muted)] hover:text-[var(--primary)] text-sm flex items-center gap-1"
                >
                    <Icon name="arrow_back" size="xs" /> Danh sách đề thi
                </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
                <span className={`${HSK_COLORS[exam.hsk_level]} text-white text-xs font-bold px-2 py-1 rounded`}>
                    HSK {exam.hsk_level}
                </span>
                <h1 className="text-2xl font-bold text-[var(--text-main)]">{exam.title}</h1>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-6">
                {flatQuestions.length} câu • {exam.duration_minutes} phút • Đạt: {exam.passing_score}đ
                <span className="ml-3 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Icon name="lock" size="xs" /> Cấu trúc đã khóa — chỉ sửa nội dung câu
                </span>
            </p>

            {/* Sections grouped — questions Q1..QN sequential */}
            <div className="space-y-6">
                {exam.sections.map((section, sIdx) => {
                    const sectionLabel = SECTION_TYPES.find(t => t.value === section.section_type)?.label
                        || section.section_type;
                    const qs = flatQuestions.filter(q => q.section_index === sIdx);
                    if (qs.length === 0) return null;
                    return (
                        <div
                            key={section.id}
                            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
                        >
                            <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-secondary)]/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                        {sectionLabel}
                                    </span>
                                    <h2 className="font-semibold text-[var(--text-main)]">
                                        {section.title || `Phần ${section.section_order}`}
                                    </h2>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        Câu {qs[0].global_index + 1} — {qs[qs.length - 1].global_index + 1}
                                    </span>
                                </div>
                                {section.audio_url && (
                                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                        <Icon name="audio_file" size="xs" /> có audio merged
                                    </span>
                                )}
                            </div>
                            <ul>
                                {qs.map(q => (
                                    <li
                                        key={q.id}
                                        className="px-5 py-3 border-b border-[var(--border)] last:border-b-0 flex items-start gap-3 hover:bg-[var(--surface-secondary)]/40 transition-colors"
                                    >
                                        <div className="w-10 text-center font-mono font-bold text-[var(--primary)] flex-shrink-0">
                                            {q.global_index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                                    {QUESTION_TYPES.find(t => t.value === q.question_type)?.label?.split(' ')[0]
                                                        || q.question_type}
                                                </span>
                                                {q.points > 1 && (
                                                    <span className="text-[10px] text-amber-500 font-mono">{q.points}đ</span>
                                                )}
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                                    [{q.correct_answer || '—'}]
                                                </span>
                                                {q.question_audio && (
                                                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
                                                        <Icon name="volume_up" size="xs" />
                                                    </span>
                                                )}
                                                {q.question_image && (
                                                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
                                                        <Icon name="image" size="xs" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                                {q.question_text || q.statement || q.passage || '(Chưa có nội dung)'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => openEdit(q)}
                                            className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                                            title="Sửa nội dung câu"
                                        >
                                            <Icon name="edit" size="xs" /> Sửa
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            {/* Edit Modal — chỉ form nội dung. KHÔNG hiển thị QuestionTypePicker. */}
            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-3xl my-8">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-lg font-bold text-[var(--text-main)]">
                                    Câu {editing.global_index + 1} — Sửa nội dung
                                </h3>
                                <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                                    {SECTION_TYPES.find(t => t.value === editing.section_type)?.label}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)] font-medium flex items-center gap-1">
                                    <Icon name="lock" size="xs" />
                                    {QUESTION_TYPES.find(t => t.value === editing.question_type)?.label
                                        || editing.question_type}
                                </span>
                            </div>
                            <button
                                onClick={() => setEditing(null)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)] rounded-lg"
                                disabled={saving}
                            >
                                <Icon name="close" size="sm" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto pr-2">
                            {/* Reuse form, nhưng KHÔNG render QuestionTypePicker → loại bỏ
                                khả năng admin đổi loại câu. group_id giữ nguyên. */}
                            <QuestionFormByType
                                form={editForm}
                                onChange={setEditForm}
                                sectionType={editing.section_type}
                                sectionId={editing.section_id}
                            />
                        </div>

                        {saveError && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                                <Icon name="error" size="xs" className="inline mr-1" />
                                {saveError}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[var(--border)]">
                            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                                Hủy
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu nội dung'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
