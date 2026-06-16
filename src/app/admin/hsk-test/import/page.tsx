'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HSK_PRESETS } from '@/components/admin/hsk-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface ImportJob {
    id: number;
    status: JobStatus;
    progress: number;
    title?: string;
    hsk_level: number;
    exam_type: 'practice' | 'exam';
    exam_id?: number | null;
    summary?: {
        examId: number;
        totalQuestions: number;
        sectionsCount: number;
        groupsCount: number;
    } | null;
    warnings?: string[];
    errors?: string[];
}

function getAdminToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
}

function formatFile(file: File | null) {
    if (!file) return 'Chưa chọn';
    const mb = file.size / 1024 / 1024;
    return `${file.name} (${mb.toFixed(1)} MB)`;
}

export default function AdminHskImportPage() {
    const [hskLevel, setHskLevel] = useState(4);
    const [examType, setExamType] = useState<'practice' | 'exam'>('exam');
    const [title, setTitle] = useState('HSK 4 OCR Import');
    const [examPdf, setExamPdf] = useState<File | null>(null);
    const [answerFile, setAnswerFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [jobId, setJobId] = useState<number | null>(null);
    const [job, setJob] = useState<ImportJob | null>(null);
    const [v2, setV2] = useState(false); // OCR v2 (blueprint-driven, HSK1-3)

    const preset = HSK_PRESETS[hskLevel];
    const canSubmit = examPdf && answerFile && (examType === 'practice' || audioFile) && !submitting;

    const expectedText = useMemo(() => {
        if (!preset) return '';
        return `Dự kiến ${preset.duration_minutes} phút, pass ${preset.passing_score} điểm.`;
    }, [preset]);

    useEffect(() => {
        setTitle(prev => {
            const auto = /^HSK \d OCR Import$/.test(prev) || !prev.trim();
            return auto ? `HSK ${hskLevel} OCR Import` : prev;
        });
    }, [hskLevel]);

    // Vào từ link /import?v2=1 (nút "Import OCR v2" ở trang v2) → bật sẵn v2.
    useEffect(() => {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('v2') === '1') {
            setV2(true);
            setHskLevel(l => (l > 3 ? 3 : l));
        }
    }, []);

    useEffect(() => {
        if (!jobId) return;

        let active = true;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const poll = async () => {
            try {
                const token = getAdminToken();
                const res = await fetch(`${API_BASE}/api/hsk-exams/import/jobs/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Không đọc được trạng thái import');
                if (!active) return;
                setJob(json.data);
                if (!['completed', 'failed'].includes(json.data.status)) {
                    timer = setTimeout(poll, 2000);
                } else {
                    setSubmitting(false);
                }
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Không đọc được trạng thái import');
                setSubmitting(false);
            }
        };

        poll();
        return () => {
            active = false;
            if (timer) clearTimeout(timer);
        };
    }, [jobId]);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        setError('');
        setJob(null);
        setJobId(null);

        try {
            const token = getAdminToken();
            const form = new FormData();
            form.append('hskLevel', String(hskLevel));
            form.append('examType', examType);
            if (v2) form.append('formatVersion', '2');
            form.append('title', title.trim() || `HSK ${hskLevel} OCR Import`);
            form.append('examPdf', examPdf);
            form.append('answerFile', answerFile);
            if (audioFile) form.append('audioFile', audioFile);

            const res = await fetch(`${API_BASE}/api/hsk-exams/import/ocr`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Không tạo được job import');
            setJobId(json.jobId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi import OCR');
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl">
            <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                <Link href="/admin/hsk-test" className="hover:text-[var(--primary)]">Đề thi HSK</Link>
                <Icon name="chevron_right" size="xs" />
                <span className="text-[var(--text-main)]">Import OCR</span>
            </nav>

            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Import đề HSK bằng OCR</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Flow này chỉ tạo đề draft từ file. Sau khi import, admin vẫn review và sửa bằng màn CRUD HSK hiện tại.
                    </p>
                </div>
                <Link href="/admin/hsk-test">
                    <Button variant="secondary">
                        <Icon name="arrow_back" size="sm" />
                        Quay lại
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                <form onSubmit={onSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-sm font-medium text-[var(--text-main)]">Cấp HSK</span>
                            <select
                                value={hskLevel}
                                onChange={event => setHskLevel(Number(event.target.value))}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                            >
                                {(v2 ? [1, 2, 3] : [1, 2, 3, 4, 5, 6]).map(level => (
                                    <option key={level} value={level}>HSK {level}</option>
                                ))}
                            </select>
                            {expectedText && <span className="text-xs text-[var(--text-muted)] mt-1 block">{expectedText}</span>}
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-[var(--text-main)]">Chế độ</span>
                            <select
                                value={examType}
                                onChange={event => setExamType(event.target.value as 'practice' | 'exam')}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                            >
                                <option value="exam">Thi - 1 file audio liên tục</option>
                                <option value="practice">Luyện tập</option>
                            </select>
                        </label>
                    </div>

                    {/* OCR v2: cấu trúc khóa theo blueprint (HSK1-3), ra đề format_version=2. */}
                    <label className="flex items-start gap-2 text-sm cursor-pointer p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                        <input
                            type="checkbox"
                            checked={v2}
                            onChange={e => { setV2(e.target.checked); if (e.target.checked && hskLevel > 3) setHskLevel(3); }}
                            className="w-4 h-4 mt-0.5"
                        />
                        <span className="text-[var(--text-main)]">
                            <b>Import OCR v2</b> — cấu trúc chuẩn HSK1-3 (đúng số đáp án, lưới ảnh 6/5, ngân hàng từ/câu); AI chỉ điền nội dung → ra đề <b>format mới (v2)</b>.
                        </span>
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-[var(--text-main)]">Tên đề</span>
                        <input
                            value={title}
                            onChange={event => setTitle(event.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                            placeholder="HSK 4 - Đề H41328"
                        />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="block rounded-xl border border-dashed border-[var(--border)] p-4 bg-[var(--background)]">
                            <span className="text-sm font-semibold text-[var(--text-main)]">File đề PDF</span>
                            <span className="block text-xs text-[var(--text-muted)] mt-1 min-h-8">{formatFile(examPdf)}</span>
                            <input
                                type="file"
                                accept="application/pdf,.pdf"
                                className="mt-3 text-sm"
                                onChange={event => setExamPdf(event.target.files?.[0] || null)}
                            />
                        </label>

                        <label className="block rounded-xl border border-dashed border-[var(--border)] p-4 bg-[var(--background)]">
                            <span className="text-sm font-semibold text-[var(--text-main)]">File đáp án</span>
                            <span className="block text-xs text-[var(--text-muted)] mt-1 min-h-8">{formatFile(answerFile)}</span>
                            <input
                                type="file"
                                accept=".txt,.json,.pdf,.docx,text/plain,application/json,application/pdf"
                                className="mt-3 text-sm"
                                onChange={event => setAnswerFile(event.target.files?.[0] || null)}
                            />
                        </label>

                        <label className="block rounded-xl border border-dashed border-[var(--border)] p-4 bg-[var(--background)]">
                            <span className="text-sm font-semibold text-[var(--text-main)]">Audio nghe</span>
                            <span className="block text-xs text-[var(--text-muted)] mt-1 min-h-8">{formatFile(audioFile)}</span>
                            <input
                                type="file"
                                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                                className="mt-3 text-sm"
                                onChange={event => setAudioFile(event.target.files?.[0] || null)}
                            />
                        </label>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-[var(--text-muted)]">
                            Đề import xong sẽ ở trạng thái tắt để admin kiểm tra trước khi public.
                        </p>
                        <Button type="submit" disabled={!canSubmit}>
                            <Icon name={submitting ? 'hourglass_empty' : 'upload'} size="sm" />
                            {submitting ? 'Đang import...' : 'Bắt đầu import'}
                        </Button>
                    </div>
                </form>

                <aside className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 self-start">
                    <h2 className="font-semibold text-[var(--text-main)] mb-3">Trạng thái</h2>

                    {!job && !submitting && (
                        <p className="text-sm text-[var(--text-muted)]">Chưa có job import.</p>
                    )}

                    {(job || submitting) && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                                    <span>{job?.status || 'queued'}</span>
                                    <span>{job?.progress || 0}%</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--primary)] transition-all"
                                        style={{ width: `${job?.progress || 5}%` }}
                                    />
                                </div>
                            </div>

                            {job?.summary && (
                                <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-sm">
                                    <p className="font-semibold text-[var(--text-main)]">Đã tạo draft exam #{job.summary.examId}</p>
                                    <p className="text-[var(--text-muted)] mt-1">
                                        {job.summary.totalQuestions} câu · {job.summary.sectionsCount} section · {job.summary.groupsCount} group
                                    </p>
                                </div>
                            )}

                            {!!job?.warnings?.length && (
                                <div>
                                    <p className="text-xs font-semibold uppercase text-amber-500 mb-2">Warnings</p>
                                    <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                                        {job.warnings.slice(0, 8).map((item, index) => (
                                            <li key={`${item}-${index}`} className="rounded bg-amber-500/10 p-2">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {!!job?.errors?.length && (
                                <div>
                                    <p className="text-xs font-semibold uppercase text-red-500 mb-2">Errors</p>
                                    <ul className="space-y-1 text-xs text-red-500">
                                        {job.errors.map((item, index) => (
                                            <li key={`${item}-${index}`} className="rounded bg-red-500/10 p-2">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {job?.status === 'completed' && job.exam_id && (
                                <Link href={v2 ? `/admin/hsk-test-v2/${job.exam_id}` : `/admin/hsk-test?expand=${job.exam_id}`}>
                                    <Button fullWidth>
                                        <Icon name="open_in_new" size="sm" />
                                        Mở đề vừa import
                                    </Button>
                                </Link>
                            )}
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

