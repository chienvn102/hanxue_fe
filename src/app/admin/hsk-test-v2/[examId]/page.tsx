'use client';

/**
 * Editor đề HSK v2 — GIỐNG HỆT form làm bài của học viên (1 câu/màn + sidebar +
 * chọn đáp án như đề thật), nhưng NỘI DUNG SỬA ĐƯỢC. Cấu trúc đề KHÓA.
 *
 * Tái dùng đúng look của exam: TrueFalseChoice (A.TRUE/B.FALSE) + hàng đáp án có
 * badge chữ cái (như McqChoice). Bấm đáp án = ĐÁNH DẤU ĐÁP ÁN ĐÚNG (xanh).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { UploadField } from '@/components/admin/UploadField';
import { TrueFalseChoice } from '@/components/hsk-test/TrueFalseChoice';
import { getMediaUrl } from '@/lib/api';
import { HSK_COLORS, SECTION_TYPES, normalizeTrueFalseAnswer } from '@/components/admin/hsk-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface Question {
    id: number; section_id: number; group_id?: number | null;
    question_number: number; question_type: string;
    question_text?: string; passage?: string; statement?: string;
    question_image?: string; transcript?: string;
    options?: unknown; options_pinyin?: string[]; option_images?: string[];
    correct_answer?: string; explanation?: string; meta?: Record<string, unknown> | null;
}
interface GroupItem { label?: string; word?: string; sentence_zh?: string; pinyin?: string; sentence_pinyin?: string }
interface GroupContent { image_url?: string; items?: GroupItem[]; passage_zh?: string; passage?: string; passage_pinyin?: string }
interface Group { id: number; group_type: string; content?: GroupContent | null }
interface Section { id: number; section_type: string; section_order: number; title?: string; groups?: Group[]; questions?: Question[] }
interface ExamDetail { id: number; title: string; hsk_level: number; exam_type: 'practice' | 'exam'; audio_url?: string | null; sections: Section[] }

interface FlatQ extends Question { sectionType: string; sectionTitle: string; gidx: number }

// Form đơn giản hoá: chỉ field nội dung cần cho v2.
interface QForm {
    question_text: string; passage: string; statement: string; question_image: string;
    transcript: string; options: string[]; options_pinyin: string[]; option_images: string[];
    correct_answer: string; explanation: string; meta: Record<string, unknown> | null;
}

const INSTRUCTION: Record<string, string> = {
    true_false: 'Nghe/đọc rồi chọn Đúng (A) hay Sai (B).',
    multiple_choice: 'Chọn đáp án đúng.',
    image_match: 'Nghe rồi chọn tranh đúng.',
    image_grid_match: 'Chọn tranh phù hợp trong lưới.',
    reply_match: 'Chọn câu trả lời phù hợp.',
    word_bank_fill: 'Chọn từ điền vào chỗ trống.',
    sentence_assembly: 'Sắp xếp các từ thành câu hoàn chỉnh.',
    fill_hanzi: 'Viết chữ Hán theo pinyin.',
};

function toForm(q: Question): QForm {
    const opts = Array.isArray(q.options) ? q.options : [];
    const optionTexts = opts.map(o => (typeof o === 'string' ? o : (o && typeof o === 'object' ? String((o as { text?: string; word?: string }).text || (o as { word?: string }).word || '') : '')));
    const optionPinyin = (Array.isArray(q.options_pinyin) && q.options_pinyin.length)
        ? q.options_pinyin.map(v => String(v || ''))
        : opts.map(o => (o && typeof o === 'object' ? String((o as { pinyin?: string }).pinyin || '') : ''));
    return {
        question_text: q.question_text || '', passage: q.passage || '', statement: q.statement || '',
        question_image: q.question_image || '', transcript: q.transcript || '',
        options: optionTexts, options_pinyin: optionPinyin,
        option_images: Array.isArray(q.option_images) ? q.option_images : [],
        correct_answer: q.question_type === 'true_false' ? (normalizeTrueFalseAnswer(q.correct_answer) || q.correct_answer || '') : (q.correct_answer || ''),
        explanation: q.explanation || '', meta: q.meta || null,
    };
}

export default function HskV2ExamEditorPage() {
    const params = useParams();
    const examId = Number(params.examId);

    const [exam, setExam] = useState<ExamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forms, setForms] = useState<Record<number, QForm>>({});
    const [groupForms, setGroupForms] = useState<Record<number, GroupContent>>({});
    const [dirtyQ, setDirtyQ] = useState<Set<number>>(new Set());
    const [dirtyG, setDirtyG] = useState<Set<number>>(new Set());
    const [cur, setCur] = useState(0);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');

    const token = () => (typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null);

    const fetchExam = useCallback(async () => {
        if (!examId) return;
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/api/hsk-exams/${examId}`, { headers: { Authorization: `Bearer ${token() || ''}` } });
            if (!res.ok) throw new Error('Không tải được đề');
            const data: ExamDetail = await res.json();
            setExam(data);
            const f: Record<number, QForm> = {};
            const g: Record<number, GroupContent> = {};
            data.sections.forEach(s => {
                (s.questions || []).forEach(q => { f[q.id] = toForm(q); });
                (s.groups || []).forEach(gr => { g[gr.id] = (gr.content && typeof gr.content === 'object') ? { ...gr.content } : {}; });
            });
            setForms(f); setGroupForms(g); setDirtyQ(new Set()); setDirtyG(new Set());
        } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi'); }
        finally { setLoading(false); }
    }, [examId]);
    useEffect(() => { fetchExam(); }, [fetchExam]);

    const flat: FlatQ[] = useMemo(() => {
        if (!exam) return [];
        const out: FlatQ[] = [];
        [...exam.sections].sort((a, b) => a.section_order - b.section_order).forEach(s => {
            [...(s.questions || [])].sort((a, b) => a.question_number - b.question_number).forEach(q => {
                out.push({ ...q, sectionType: s.section_type, sectionTitle: s.title || `Phần ${s.section_order}`, gidx: out.length });
            });
        });
        return out;
    }, [exam]);

    const groupsById = useMemo(() => {
        const m = new Map<number, Group>();
        exam?.sections.forEach(s => (s.groups || []).forEach(g => m.set(g.id, g)));
        return m;
    }, [exam]);

    const setQ = (qid: number, patch: Partial<QForm>) => {
        setForms(prev => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
        setDirtyQ(prev => new Set(prev).add(qid)); setSavedMsg('');
    };
    const setG = (gid: number, patch: Partial<GroupContent>) => {
        setGroupForms(prev => ({ ...prev, [gid]: { ...prev[gid], ...patch } }));
        setDirtyG(prev => new Set(prev).add(gid)); setSavedMsg('');
    };

    const saveAll = async () => {
        setSaving(true); setError('');
        try {
            for (const qid of Array.from(dirtyQ)) {
                const fm = forms[qid];
                const flatQ = flat.find(q => q.id === qid);
                const payload = {
                    question_text: fm.question_text, passage: fm.passage, statement: fm.statement,
                    question_image: fm.question_image, transcript: fm.transcript,
                    options: fm.options, options_pinyin: fm.options_pinyin, option_images: fm.option_images,
                    correct_answer: flatQ?.question_type === 'true_false' ? (normalizeTrueFalseAnswer(fm.correct_answer) || fm.correct_answer) : fm.correct_answer,
                    explanation: fm.explanation, meta: fm.meta,
                };
                const r = await fetch(`${API_BASE}/api/hsk-exams/questions/${qid}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() || ''}` }, body: JSON.stringify(payload),
                });
                if (!r.ok) throw new Error(`Lưu câu id ${qid} lỗi`);
            }
            for (const gid of Array.from(dirtyG)) {
                const gr = groupsById.get(gid);
                const r = await fetch(`${API_BASE}/api/hsk-exams/groups/${gid}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() || ''}` },
                    body: JSON.stringify({ group_type: gr?.group_type, content: groupForms[gid] }),
                });
                if (!r.ok) throw new Error(`Lưu group id ${gid} lỗi`);
            }
            const n = dirtyQ.size + dirtyG.size;
            setDirtyQ(new Set()); setDirtyG(new Set()); setSavedMsg(`Đã lưu ${n} mục.`);
        } catch (e) { setError(e instanceof Error ? e.message : 'Lưu lỗi'); }
        finally { setSaving(false); }
    };

    const saveExamAudio = async (url: string) => {
        try {
            await fetch(`${API_BASE}/api/hsk-exams/${examId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() || ''}` }, body: JSON.stringify({ audio_url: url }),
            });
            setExam(prev => (prev ? { ...prev, audio_url: url } : prev));
        } catch (e) { console.error(e); }
    };

    if (loading) return <div className="p-6 text-center text-[var(--text-muted)]">Đang tải đề...</div>;
    if (error && !exam) return <div className="p-6 text-center"><Icon name="error" size="xl" className="text-red-500 mb-3" /><p className="mb-4">{error}</p><Link href="/admin/hsk-test-v2"><Button variant="secondary">Quay lại</Button></Link></div>;
    if (!exam || flat.length === 0) return null;

    const q = flat[cur];
    const fm = forms[q.id];
    const group = q.group_id ? groupsById.get(q.group_id) : undefined;
    const groupLabels = group && groupForms[group.id]?.items?.length ? groupForms[group.id].items!.map((it, i) => it.label || String.fromCharCode(65 + i)) : ['A', 'B', 'C', 'D', 'E', 'F'];
    const dirtyCount = dirtyQ.size + dirtyG.size;

    return (
        <div className="flex gap-4 -m-8 min-h-screen">
            {/* Sidebar — danh sách câu hỏi như exam */}
            <aside className="w-56 shrink-0 bg-[var(--surface)] border-r border-[var(--border)] p-3 overflow-y-auto">
                <Link href="/admin/hsk-test-v2" className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] flex items-center gap-1 mb-3">
                    <Icon name="arrow_back" size="xs" /> Danh sách đề (v2)
                </Link>
                <p className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2">Danh sách câu hỏi</p>
                {[...exam.sections].sort((a, b) => a.section_order - b.section_order).map(s => {
                    const label = SECTION_TYPES.find(t => t.value === s.section_type)?.label || s.section_type;
                    const qs = flat.filter(x => x.section_id === s.id);
                    return (
                        <div key={s.id} className="mb-3">
                            <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">{label}</p>
                            <div className="grid grid-cols-5 gap-1">
                                {qs.map(x => {
                                    const isCur = x.gidx === cur;
                                    const filled = !!forms[x.id]?.correct_answer;
                                    return (
                                        <button key={x.id} onClick={() => setCur(x.gidx)}
                                            className={`h-8 rounded text-xs font-medium border ${isCur ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : filled ? 'bg-[var(--surface-secondary)] text-[var(--text-main)] border-[var(--border)]' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'} ${dirtyQ.has(x.id) ? 'ring-1 ring-amber-400' : ''}`}>
                                            {x.question_number}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </aside>

            {/* Main — 1 câu/màn như exam */}
            <main className="flex-1 min-w-0 pb-24">
                {/* Top: tiêu đề + audio đề */}
                <div className="flex flex-wrap items-center gap-2 mb-3 pt-1">
                    <span className={`${HSK_COLORS[exam.hsk_level]} text-white text-xs font-bold px-2 py-1 rounded`}>HSK {exam.hsk_level}</span>
                    <h1 className="font-bold text-[var(--text-main)]">{exam.title}</h1>
                    <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1"><Icon name="lock" size="xs" /> cấu trúc khóa</span>
                </div>
                <div className="mb-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 mb-1.5"><Icon name="audio_file" size="xs" /> Audio đề (1 file cho cả đề)</label>
                    <UploadField label="" value={exam.audio_url || ''} onChange={saveExamAudio} type="audio" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm" />
                </div>

                {/* Question card */}
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-[var(--text-main)]">Câu {q.question_number}/{flat[flat.length - 1].question_number}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">{q.question_type}</span>
                    </div>

                    {/* Instruction box (đỏ như exam) */}
                    <div className="mb-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-[var(--text-secondary)]">
                        <Icon name="info" size="xs" className="inline mr-1 text-red-500" />
                        {INSTRUCTION[q.question_type] || 'Điền nội dung câu hỏi và đáp án.'}
                    </div>

                    {/* Audio nghe (listening): phát audio đề để admin đối chiếu */}
                    {q.sectionType === 'listening' && exam.audio_url && (
                        <audio controls src={getMediaUrl(exam.audio_url)} className="w-full mb-4 h-9" />
                    )}

                    {/* Tài nguyên dùng chung (group): lưới ảnh / ngân hàng / đoạn văn — sửa nội dung */}
                    {group && (
                        <GroupResourceEditor group={group} content={groupForms[group.id] || {}} onChange={patch => setG(group.id, patch)} />
                    )}

                    {/* Nội dung câu — editable */}
                    <QuestionBody q={q} fm={fm} groupLabels={groupLabels}
                        set={patch => setQ(q.id, patch)} />

                    {/* Giải thích */}
                    <div className="mt-4">
                        <label className="text-xs text-[var(--text-muted)] block mb-1">Giải thích (tuỳ chọn)</label>
                        <textarea value={fm.explanation} onChange={e => setQ(q.id, { explanation: e.target.value })} rows={2}
                            className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Vì sao đáp án đúng..." />
                    </div>
                </div>

                {/* Nav prev/next */}
                <div className="flex items-center justify-between mt-4">
                    <Button variant="outline" disabled={cur === 0} onClick={() => setCur(c => Math.max(0, c - 1))}><Icon name="arrow_back" size="sm" /> Câu trước</Button>
                    <span className="text-xs text-[var(--text-muted)]">{cur + 1} / {flat.length}</span>
                    <Button variant="outline" disabled={cur === flat.length - 1} onClick={() => setCur(c => Math.min(flat.length - 1, c + 1))}>Câu sau <Icon name="arrow_forward" size="sm" /></Button>
                </div>
            </main>

            {/* Thanh lưu cố định */}
            <div className="fixed bottom-0 left-64 right-0 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-3 flex items-center justify-between gap-4 z-20">
                <span className="text-sm text-[var(--text-muted)]">{dirtyCount > 0 ? `${dirtyCount} mục chưa lưu` : (savedMsg || 'Tất cả đã lưu')}{error && <span className="text-red-500 ml-2">{error}</span>}</span>
                <Button onClick={saveAll} disabled={saving || dirtyCount === 0} className="flex items-center gap-1.5"><Icon name="save" size="sm" /> {saving ? 'Đang lưu...' : `Lưu tất cả${dirtyCount ? ` (${dirtyCount})` : ''}`}</Button>
            </div>
        </div>
    );
}

/* Nội dung câu theo loại — GIỐNG exam, editable. */
function QuestionBody({ q, fm, groupLabels, set }: { q: FlatQ; fm: QForm; groupLabels: string[]; set: (p: Partial<QForm>) => void }) {
    const type = q.question_type;
    const updateOpt = (idx: number, v: string) => { const next = [...fm.options]; next[idx] = v; set({ options: next }); };
    const updatePy = (idx: number, v: string) => { const next = [...(fm.options_pinyin || [])]; next[idx] = v; set({ options_pinyin: next }); };
    const updateImg = (idx: number, v: string) => { const next = [...fm.option_images]; next[idx] = v; set({ option_images: next }); };

    // statement / question_text editable
    const stem = (
        <textarea value={fm.statement || fm.question_text}
            onChange={e => set(type === 'true_false' ? { statement: e.target.value } : { question_text: e.target.value })}
            rows={2} placeholder={type === 'true_false' ? 'Câu nhận định (tiếng Trung)...' : 'Nội dung câu hỏi (tiếng Trung)...'}
            className="w-full px-3 py-2 border rounded-lg text-lg hanzi mb-3" />
    );

    if (type === 'true_false') {
        return (
            <div>
                {stem}
                {/* ảnh câu (nếu có) */}
                <div className="max-w-xs mb-3">
                    <UploadField label="Ảnh câu (nếu có)" value={fm.question_image} onChange={v => set({ question_image: v })} type="image" accept="image/jpeg,image/png,image/webp,image/gif" />
                </div>
                {/* transcript nghe */}
                {q.sectionType === 'listening' && (
                    <input value={fm.transcript} onChange={e => set({ transcript: e.target.value })} placeholder="Lời thoại nghe (transcript)" className="w-full px-3 py-1.5 border rounded text-sm hanzi mb-3" />
                )}
                <TrueFalseChoice value={normalizeTrueFalseAnswer(fm.correct_answer) || fm.correct_answer} onChange={v => set({ correct_answer: v })} style="AB" />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Bấm A.TRUE / B.FALSE = đánh dấu đáp án đúng.</p>
            </div>
        );
    }

    if (type === 'multiple_choice') {
        return (
            <div>
                {stem}
                {q.sectionType === 'listening' && (
                    <input value={fm.transcript} onChange={e => set({ transcript: e.target.value })} placeholder="Lời thoại nghe (transcript)" className="w-full px-3 py-1.5 border rounded text-sm hanzi mb-3" />
                )}
                <div className="space-y-2">
                    {fm.options.map((opt, idx) => {
                        const label = String.fromCharCode(65 + idx);
                        const correct = fm.correct_answer === label;
                        return (
                            <div key={idx} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 ${correct ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                                <button type="button" title="Đánh dấu đáp án đúng" onClick={() => set({ correct_answer: label })}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${correct ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>{label}</button>
                                <input value={opt} onChange={e => updateOpt(idx, e.target.value)} placeholder={`Đáp án ${label} (tiếng Trung)`} className="flex-1 bg-transparent outline-none hanzi text-[var(--text-main)]" />
                                <input value={(fm.options_pinyin || [])[idx] || ''} onChange={e => updatePy(idx, e.target.value)} placeholder="pinyin" className="w-24 bg-transparent outline-none text-xs italic text-[var(--text-muted)]" />
                            </div>
                        );
                    })}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Bấm chữ cái = đáp án đúng.</p>
            </div>
        );
    }

    if (type === 'image_match') {
        return (
            <div>
                {stem}
                {q.sectionType === 'listening' && (
                    <input value={fm.transcript} onChange={e => set({ transcript: e.target.value })} placeholder="Lời thoại nghe (transcript)" className="w-full px-3 py-1.5 border rounded text-sm hanzi mb-3" />
                )}
                <div className="grid grid-cols-3 gap-3">
                    {(fm.option_images.length ? fm.option_images : ['', '', '']).map((url, idx) => {
                        const label = String.fromCharCode(65 + idx);
                        const correct = fm.correct_answer === label;
                        return (
                            <div key={idx} className={`rounded-xl border-2 p-2 ${correct ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)]'}`}>
                                <button type="button" onClick={() => set({ correct_answer: label })}
                                    className={`w-6 h-6 rounded-full text-xs font-bold mb-1 ${correct ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>{label}</button>
                                <UploadField label="" value={url} onChange={v => updateImg(idx, v)} type="image" accept="image/jpeg,image/png,image/webp,image/gif" />
                            </div>
                        );
                    })}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Bấm chữ cái = tranh đúng.</p>
            </div>
        );
    }

    if (type === 'image_grid_match' || type === 'reply_match' || type === 'word_bank_fill') {
        return (
            <div>
                <textarea value={fm.question_text} onChange={e => set({ question_text: e.target.value })} rows={2} placeholder="Câu hỏi / câu có chỗ trống (tiếng Trung)..." className="w-full px-3 py-2 border rounded-lg text-lg hanzi mb-3" />
                {q.sectionType === 'listening' && (
                    <input value={fm.transcript} onChange={e => set({ transcript: e.target.value })} placeholder="Lời thoại nghe (transcript)" className="w-full px-3 py-1.5 border rounded text-sm hanzi mb-3" />
                )}
                <label className="text-xs text-[var(--text-muted)] block mb-1">Đáp án đúng (chọn 1 chữ cái trong tài nguyên dùng chung):</label>
                <div className="flex flex-wrap gap-2">
                    {groupLabels.map(letter => {
                        const correct = fm.correct_answer === letter;
                        return (
                            <button key={letter} type="button" onClick={() => set({ correct_answer: letter })}
                                className={`w-11 h-11 rounded-lg border-2 font-bold ${correct ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>{letter}</button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (type === 'sentence_assembly') {
        return (
            <div>
                <input value={fm.question_text} onChange={e => set({ question_text: e.target.value })} placeholder='Các mảnh: 词1 / 词2 / 词3' className="w-full px-3 py-2 border rounded-lg text-lg hanzi mb-2" />
                <input value={fm.correct_answer} onChange={e => set({ correct_answer: e.target.value })} placeholder="Câu hoàn chỉnh đúng" className="w-full px-3 py-2 border rounded-lg hanzi" />
            </div>
        );
    }

    if (type === 'fill_hanzi') {
        return (
            <div>
                <input value={fm.question_text} onChange={e => set({ question_text: e.target.value })} placeholder="Pinyin gợi ý (vd: chū)" className="w-full px-3 py-2 border rounded-lg mb-2" />
                <input value={fm.correct_answer} onChange={e => set({ correct_answer: e.target.value })} placeholder="Chữ Hán đúng" className="w-full px-3 py-2 border rounded-lg text-lg hanzi" />
            </div>
        );
    }

    // fallback
    return (
        <div>
            {stem}
            <input value={fm.correct_answer} onChange={e => set({ correct_answer: e.target.value })} placeholder="Đáp án đúng" className="w-full px-3 py-2 border rounded-lg" />
        </div>
    );
}

/* Tài nguyên dùng chung: lưới ảnh (1 ảnh ghép) / ngân hàng từ-câu / đoạn văn. */
function GroupResourceEditor({ group, content, onChange }: { group: Group; content: GroupContent; onChange: (p: Partial<GroupContent>) => void }) {
    const items = content.items || [];
    const updateItem = (idx: number, patch: Partial<GroupItem>) => {
        const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange({ items: next });
    };
    return (
        <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <p className="text-[11px] font-semibold uppercase text-purple-600 dark:text-purple-400 mb-2">Tài nguyên dùng chung của cụm</p>
            {group.group_type === 'image_grid' && (
                <div className="max-w-md">
                    <UploadField label="Ảnh lưới (1 ảnh ghép A–F)" value={content.image_url || ''} onChange={v => onChange({ image_url: v })} type="image" accept="image/jpeg,image/png,image/webp,image/gif" />
                </div>
            )}
            {(group.group_type === 'word_bank' || group.group_type === 'reply_bank') && (
                <div className="space-y-1.5">
                    {items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <span className="w-5 text-center font-bold text-xs text-[var(--primary)]">{it.label || String.fromCharCode(65 + idx)}</span>
                            <input value={(it.word ?? it.sentence_zh) || ''} onChange={e => updateItem(idx, group.group_type === 'word_bank' ? { word: e.target.value } : { sentence_zh: e.target.value })} placeholder={group.group_type === 'word_bank' ? 'Từ (Hán)' : 'Câu (Hán)'} className="flex-1 px-2 py-1 border rounded text-sm hanzi" />
                            <input value={(it.pinyin ?? it.sentence_pinyin) || ''} onChange={e => updateItem(idx, group.group_type === 'word_bank' ? { pinyin: e.target.value } : { sentence_pinyin: e.target.value })} placeholder="pinyin" className="w-32 px-2 py-1 border rounded text-xs italic" />
                        </div>
                    ))}
                </div>
            )}
            {(group.group_type === 'passage' || group.group_type === 'passage_multi') && (
                <textarea value={(content.passage_zh ?? content.passage) || ''} onChange={e => onChange(group.group_type === 'passage' ? { passage_zh: e.target.value } : { passage: e.target.value })} rows={4} placeholder="Đoạn văn (tiếng Trung)..." className="w-full px-3 py-2 border rounded-lg text-sm hanzi" />
            )}
        </div>
    );
}
