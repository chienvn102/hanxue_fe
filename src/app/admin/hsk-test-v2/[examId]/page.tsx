'use client';

/**
 * Editor đề HSK v2 — kiểu "CẢ TRANG ĐỀ NHƯ ĐANG LÀM BÀI".
 *
 * Khác editor v1 (modal từng câu): trang này render toàn bộ đề theo section, mỗi
 * câu là 1 ô sửa INLINE (không modal). Admin cuộn + điền nội dung/đáp án/giải thích
 * như đang làm bài, rồi bấm "Lưu tất cả". Format đề KHÓA (không đổi loại/số câu).
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
    question_text?: string;
    passage?: string;
    statement?: string;
    question_image?: string;
    question_audio?: string;
    transcript?: string;
    audio_start_time?: number;
    audio_end_time?: number;
    audio_play_count?: number;
    options?: unknown;
    options_pinyin?: string[];
    option_images?: string[];
    correct_answer?: string;
    explanation?: string;
    difficulty?: number;
    points?: number;
    meta?: Record<string, unknown> | null;
}

interface Group { id: number; group_type: string; content?: { items?: unknown[] } | null }

interface Section {
    id: number;
    section_type: string;
    section_order: number;
    title?: string;
    groups?: Group[];
    questions?: Question[];
}

interface ExamDetail {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: 'practice' | 'exam';
    audio_url?: string | null;
    format_version?: number;
    sections: Section[];
}

// Map question → form, GIỮ ĐÚNG SỐ đáp án (v2: MC 3 ô, image_match 3 ảnh — không pad lên 4).
function questionToForm(q: Question): QuestionFormData {
    const opts = Array.isArray(q.options) ? q.options : [];
    const optionTexts = opts.map(o => {
        if (typeof o === 'string') return o;
        if (o && typeof o === 'object') {
            const obj = o as { text?: string; word?: string; value?: string };
            return obj.text || obj.word || obj.value || '';
        }
        return '';
    });
    const optionPinyin = (Array.isArray(q.options_pinyin) && q.options_pinyin.length)
        ? q.options_pinyin.map(v => String(v || ''))
        : opts.map(o => (o && typeof o === 'object' ? String((o as { pinyin?: string }).pinyin || '') : ''));
    return {
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
        options: optionTexts,
        options_pinyin: optionPinyin,
        option_images: Array.isArray(q.option_images) ? q.option_images : [],
        correct_answer: q.question_type === 'true_false'
            ? (normalizeTrueFalseAnswer(q.correct_answer) || q.correct_answer || '')
            : (q.correct_answer || ''),
        explanation: q.explanation || '',
        difficulty: q.difficulty || 1,
        points: q.points || 1,
        group_id: q.group_id ?? null,
        meta: q.meta || null,
    };
}

function formToPayload(form: QuestionFormData) {
    // LOCK: không gửi question_type/question_number/group_id (giữ cấu trúc).
    return {
        question_text: form.question_text,
        passage: form.passage,
        statement: form.statement,
        question_image: form.question_image,
        transcript: form.transcript,
        options: form.options,
        options_pinyin: form.options_pinyin,
        option_images: form.option_images,
        correct_answer: form.question_type === 'true_false'
            ? (normalizeTrueFalseAnswer(form.correct_answer) || form.correct_answer)
            : form.correct_answer,
        explanation: form.explanation,
        meta: form.meta,
    };
}

export default function HskV2ExamEditorPage() {
    const params = useParams();
    const examId = Number(params.examId);

    const [exam, setExam] = useState<ExamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forms, setForms] = useState<Record<number, QuestionFormData>>({});
    const [dirty, setDirty] = useState<Set<number>>(new Set());
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');

    const token = () => (typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null);

    const fetchExam = useCallback(async () => {
        if (!examId) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/hsk-exams/${examId}`, {
                headers: { Authorization: `Bearer ${token() || ''}` },
            });
            if (!res.ok) throw new Error('Không tải được đề thi');
            const data: ExamDetail = await res.json();
            setExam(data);
            // Init forms cho mọi câu.
            const f: Record<number, QuestionFormData> = {};
            data.sections.forEach(s => (s.questions || []).forEach(q => { f[q.id] = questionToForm(q); }));
            setForms(f);
            setDirty(new Set());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi tải đề');
        } finally {
            setLoading(false);
        }
    }, [examId]);

    useEffect(() => { fetchExam(); }, [fetchExam]);

    // group_id → số ô (5/6) để picker đáp án A–F/A–E đúng.
    const groupCount = useMemo(() => {
        const m = new Map<number, number>();
        exam?.sections.forEach(s => (s.groups || []).forEach(g => {
            const items = g.content && Array.isArray(g.content.items) ? g.content.items.length : 6;
            m.set(g.id, items);
        }));
        return m;
    }, [exam]);

    const setQForm = (qid: number, form: QuestionFormData) => {
        setForms(prev => ({ ...prev, [qid]: form }));
        setDirty(prev => new Set(prev).add(qid));
        setSavedMsg('');
    };

    const saveAll = async () => {
        if (!dirty.size) return;
        setSaving(true);
        setSavedMsg('');
        try {
            const ids = Array.from(dirty);
            for (const qid of ids) {
                const res = await fetch(`${API_BASE}/api/hsk-exams/questions/${qid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() || ''}` },
                    body: JSON.stringify(formToPayload(forms[qid])),
                });
                if (!res.ok) throw new Error(`Lưu câu (id ${qid}) thất bại`);
            }
            setDirty(new Set());
            setSavedMsg(`Đã lưu ${ids.length} câu.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lưu thất bại');
        } finally {
            setSaving(false);
        }
    };

    const saveExamAudio = async (url: string) => {
        try {
            await fetch(`${API_BASE}/api/hsk-exams/${examId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() || ''}` },
                body: JSON.stringify({ audio_url: url }),
            });
            setExam(prev => (prev ? { ...prev, audio_url: url } : prev));
        } catch (e) { console.error('Save exam audio error:', e); }
    };

    if (loading) return <div className="p-6 text-center text-[var(--text-muted)]">Đang tải đề...</div>;
    if (error && !exam) return (
        <div className="p-6 text-center">
            <Icon name="error" size="xl" className="text-red-500 mb-3" />
            <p className="text-[var(--text-secondary)] mb-4">{error}</p>
            <Link href="/admin/hsk-test-v2"><Button variant="secondary"><Icon name="arrow_back" size="sm" /> Quay lại</Button></Link>
        </div>
    );
    if (!exam) return null;

    return (
        <div className="max-w-4xl mx-auto pb-28">
            <Link href="/admin/hsk-test-v2" className="text-[var(--text-muted)] hover:text-[var(--primary)] text-sm flex items-center gap-1 mb-2">
                <Icon name="arrow_back" size="xs" /> Danh sách đề (v2)
            </Link>
            <div className="flex flex-wrap items-center gap-3 mb-1">
                <span className={`${HSK_COLORS[exam.hsk_level]} text-white text-xs font-bold px-2 py-1 rounded`}>HSK {exam.hsk_level}</span>
                <h1 className="text-2xl font-bold text-[var(--text-main)]">{exam.title}</h1>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4 inline-flex items-center gap-1">
                <Icon name="lock" size="xs" /> Cấu trúc đã khóa — điền nội dung như đang làm bài, rồi “Lưu tất cả”.
            </p>

            {/* 1 audio cho cả đề */}
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
            </div>

            {/* Các section — render cả đề */}
            <div className="space-y-8">
                {[...exam.sections].sort((a, b) => a.section_order - b.section_order).map(section => {
                    const sectionLabel = SECTION_TYPES.find(t => t.value === section.section_type)?.label || section.section_type;
                    const qs = [...(section.questions || [])].sort((a, b) => a.question_number - b.question_number);
                    return (
                        <section key={section.id}>
                            <div className="sticky top-0 z-10 bg-[var(--background)] py-2 mb-2 flex items-center gap-2">
                                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">{sectionLabel}</span>
                                <h2 className="font-semibold text-[var(--text-main)]">{section.title || `Phần ${section.section_order}`}</h2>
                            </div>

                            {/* Tài nguyên dùng chung (lưới ảnh A–F, ngân hàng từ/câu, đoạn đọc) */}
                            {(section.groups?.length ?? 0) > 0 && (
                                <div className="mb-4">
                                    <GroupManager sectionId={section.id} token={token()} locked />
                                </div>
                            )}

                            <div className="space-y-3">
                                {qs.map(q => {
                                    const form = forms[q.id];
                                    if (!form) return null;
                                    const isDirty = dirty.has(q.id);
                                    return (
                                        <div key={q.id} className={`bg-[var(--surface)] rounded-xl border p-4 ${isDirty ? 'border-amber-400/60' : 'border-[var(--border)]'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-9 h-9 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold flex items-center justify-center text-sm shrink-0">
                                                    {q.question_number}
                                                </span>
                                                <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                                    {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}
                                                </span>
                                                {isDirty && <span className="text-[10px] text-amber-600 dark:text-amber-400">• chưa lưu</span>}
                                            </div>
                                            <QuestionFormByType
                                                form={form}
                                                onChange={f => setQForm(q.id, f)}
                                                sectionType={section.section_type}
                                                examType={exam.exam_type}
                                                hskLevel={exam.hsk_level}
                                                simplified
                                                groupItemCount={q.group_id ? (groupCount.get(q.group_id) || 6) : undefined}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Thanh lưu cố định dưới */}
            <div className="fixed bottom-0 left-64 right-0 bg-[var(--surface)] border-t border-[var(--border)] px-8 py-3 flex items-center justify-between gap-4 z-20">
                <span className="text-sm text-[var(--text-muted)]">
                    {dirty.size > 0 ? `${dirty.size} câu chưa lưu` : (savedMsg || 'Tất cả đã lưu')}
                    {error && <span className="text-red-500 ml-2">{error}</span>}
                </span>
                <Button onClick={saveAll} disabled={saving || dirty.size === 0} className="flex items-center gap-1.5">
                    <Icon name="save" size="sm" /> {saving ? 'Đang lưu...' : `Lưu tất cả${dirty.size ? ` (${dirty.size})` : ''}`}
                </Button>
            </div>
        </div>
    );
}
