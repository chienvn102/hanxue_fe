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
import { UploadField } from '@/components/admin/UploadField';
import { GroupManager } from '@/components/admin/GroupManager';
import {
    HSK_COLORS, SECTION_TYPES, QUESTION_TYPES,
    DEFAULT_QUESTION_FORM,
    normalizeTrueFalseAnswer,
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
    groups?: { id: number }[];
    questions?: Question[];
}

interface ExamDetail {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: 'practice' | 'exam';
    duration_minutes: number;
    passing_score: number;
    description?: string;
    audio_url?: string | null;     // v2: 1 audio/đề
    format_version?: number;       // 1 = v1, 2 = v2 (builder mới)
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
    const [generatingAudio, setGeneratingAudio] = useState(false);
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
        // Normalize options: BE có thể trả object {label, text, word, pinyin} từ OCR import,
        // hoặc string thuần từ data cũ. Form expects string[].
        const normalizeOptions = (opts: unknown): string[] => {
            if (!Array.isArray(opts)) return ['', '', '', ''];
            const mapped = opts.map(o => {
                if (typeof o === 'string') return o;
                if (o && typeof o === 'object') {
                    const obj = o as { text?: string; word?: string; value?: string };
                    return obj.text || obj.word || obj.value || '';
                }
                return '';
            });
            // Đảm bảo có ít nhất 4 slot cho UI MCQ
            while (mapped.length < 4) mapped.push('');
            return mapped;
        };
        const normalizePinyin = (opts: unknown, raw: unknown): string[] => {
            if (Array.isArray(raw) && raw.length) {
                return raw.map(v => String(v || ''));
            }
            // Nếu options object có .pinyin, lấy từ đó
            if (Array.isArray(opts)) {
                return opts.map(o => {
                    if (o && typeof o === 'object') {
                        return String((o as { pinyin?: string }).pinyin || '');
                    }
                    return '';
                });
            }
            return ['', '', '', ''];
        };
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
            options: normalizeOptions(q.options),
            options_pinyin: normalizePinyin(q.options, q.options_pinyin),
            option_images: (q.option_images && q.option_images.length >= 3) ? q.option_images : ['', '', '', ''],
            correct_answer: q.question_type === 'true_false'
                ? (normalizeTrueFalseAnswer(q.correct_answer) || q.correct_answer || '')
                : (q.correct_answer || ''),
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
                correct_answer: editForm.question_type === 'true_false'
                    ? (normalizeTrueFalseAnswer(editForm.correct_answer) || editForm.correct_answer)
                    : editForm.correct_answer,
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

    const handleGenerateAudio = async () => {
        if (!editing) return;
        setGeneratingAudio(true);
        setSaveError('');
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
            const res = await fetch(`${API_BASE}/api/admin/hsk-questions/${editing.id}/gen-audio`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token || ''}` },
            });
            const queued = await res.json();
            if (!res.ok || !queued.jobId) throw new Error(queued.message || 'Tao audio that bai');

            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const statusRes = await fetch(`${API_BASE}/api/admin/jobs/${queued.jobId}`, {
                    headers: { Authorization: `Bearer ${token || ''}` },
                });
                const status = await statusRes.json();
                if (status.status === 'done' && status.url) {
                    setEditForm(prev => ({ ...prev, question_audio: status.url }));
                    return;
                }
                if (status.status === 'failed') throw new Error(status.error || 'Tao audio that bai');
            }
            throw new Error('Tao audio qua lau, vui long thu lai');
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Tao audio that bai');
        } finally {
            setGeneratingAudio(false);
        }
    };

    // v2: lưu 1 audio cho cả đề (PUT exam.audio_url). Đề v1 vẫn dùng audio theo section.
    const saveExamAudio = async (url: string) => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
            await fetch(`${API_BASE}/api/hsk-exams/${examId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
                body: JSON.stringify({ audio_url: url }),
            });
            setExam(prev => (prev ? { ...prev, audio_url: url } : prev));
        } catch (e) {
            console.error('Save exam audio error:', e);
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

    const backHref = exam.format_version === 2 ? '/admin/hsk-test-v2' : '/admin/hsk-test';
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Link
                    href={backHref}
                    className="text-[var(--text-muted)] hover:text-[var(--primary)] text-sm flex items-center gap-1"
                >
                    <Icon name="arrow_back" size="xs" /> Danh sách đề thi {exam.format_version === 2 ? '(v2)' : ''}
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

            {/* v2: 1 file audio cho cả đề (phần Nghe). Đề v1 chưa set → test-taking fallback audio theo section. */}
            <div className="mb-6 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
                <label className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-1.5 mb-2">
                    <Icon name="audio_file" size="sm" /> Audio đề (1 file nghe cho cả đề)
                </label>
                <UploadField
                    label=""
                    value={exam.audio_url || ''}
                    onChange={saveExamAudio}
                    type="audio"
                    accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Upload 1 file nghe liên tục cho cả đề. Học viên phát ở phần Nghe (tự lưu khi chọn file).
                </p>
            </div>

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
                            {/* Nội dung dùng chung (lưới ảnh A–F, ngân hàng từ/câu, đoạn đọc).
                                Locked: chỉ sửa nội dung group, không thêm/xoá (giữ format). */}
                            {(section.groups?.length ?? 0) > 0 && (
                                <div className="px-5 pt-3">
                                    <GroupManager sectionId={section.id} token={adminToken} locked />
                                </div>
                            )}
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
                            {/* Nút tạo audio (edge-tts) per câu — ẨN ở v2 (đề v2 chỉ dùng 1 audio cấp đề). */}
                            {editing.section_type === 'listening' && exam.exam_type === 'practice' && exam.format_version !== 2 && (
                                <div className="mb-4 flex justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={handleGenerateAudio}
                                        disabled={generatingAudio || saving}
                                    >
                                        <Icon name="graphic_eq" size="sm" className="mr-2" />
                                        {generatingAudio ? 'Dang tao audio...' : 'Tao audio AI'}
                                    </Button>
                                </div>
                            )}
                            {/* Reuse form, nhưng KHÔNG render QuestionTypePicker → loại bỏ
                                khả năng admin đổi loại câu. group_id giữ nguyên.
                                examType quyết định form có hiện audio per câu hay không. */}
                            <QuestionFormByType
                                form={editForm}
                                onChange={setEditForm}
                                sectionType={editing.section_type}
                                sectionId={editing.section_id}
                                examType={exam.exam_type}
                                hskLevel={exam.hsk_level}
                                simplified={exam.format_version === 2}
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
