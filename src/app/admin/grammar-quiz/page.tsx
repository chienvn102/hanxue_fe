'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
    fetchGrammarList,
    adminListGrammarQuiz,
    adminCreateGrammarQuiz,
    adminUpdateGrammarQuiz,
    adminDeleteGrammarQuiz,
    type Grammar,
    type AdminGrammarQuizQuestion,
    type AdminGrammarQuizPayload,
} from '@/lib/api';

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];
const HSK_COLORS: Record<number, string> = {
    1: 'bg-green-500',
    2: 'bg-blue-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-500',
    6: 'bg-purple-500',
};

const TYPE_LABEL: Record<string, string> = {
    multiple_choice: 'Chọn đáp án đúng',
    fill_blank: 'Điền chỗ trống',
    error_identify: 'Tìm câu đúng / lỗi sai',
    sentence_order: 'Sắp xếp thứ tự',
};

interface FormState {
    grammar_pattern_id: number | '';
    question_text: string;
    options: [string, string, string, string];
    correct_index: number; // 0..3
    explanation: string;
}

const EMPTY_FORM: FormState = {
    grammar_pattern_id: '',
    question_text: '',
    options: ['', '', '', ''],
    correct_index: 0,
    explanation: '',
};

function GrammarQuizAdminInner() {
    const { isAuthenticated, loading: authLoading } = useAdminAuth();
    const search = useSearchParams();

    // ----- List state -----
    const [questions, setQuestions] = useState<AdminGrammarQuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [hskFilter, setHskFilter] = useState<number | null>(null);
    const [grammarFilter, setGrammarFilter] = useState<number | null>(() => {
        const g = parseInt(search.get('grammar') ?? '', 10);
        return Number.isFinite(g) ? g : null;
    });

    // ----- Grammar list (for filter dropdown + form selector) -----
    const [grammars, setGrammars] = useState<Grammar[]>([]);
    const grammarById = useMemo(() => {
        const m = new Map<number, Grammar>();
        grammars.forEach(g => m.set(g.id, g));
        return m;
    }, [grammars]);

    // ----- Modal state -----
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [grammarSearchText, setGrammarSearchText] = useState('');
    const [grammarPickerHsk, setGrammarPickerHsk] = useState('');

    // ----- Toast / inline error -----
    const [pageError, setPageError] = useState('');

    const grammarPickerOptions = useMemo(() => {
        const needle = grammarSearchText.trim().toLowerCase();
        const filtered = grammars.filter(g => {
            if (grammarPickerHsk && String(g.hskLevel) !== grammarPickerHsk) return false;
            if (!needle) return true;
            return [
                g.grammarPoint,
                g.patternFormula,
                String(g.id),
            ].some(v => String(v || '').toLowerCase().includes(needle));
        });

        const current = form.grammar_pattern_id ? grammarById.get(Number(form.grammar_pattern_id)) : undefined;
        if (current && !filtered.some(g => g.id === current.id)) return [current, ...filtered];
        return filtered;
    }, [form.grammar_pattern_id, grammarById, grammarPickerHsk, grammarSearchText, grammars]);

    const loadGrammars = useCallback(async () => {
        try {
            const res = await fetchGrammarList({ limit: 200 });
            setGrammars(res.data);
        } catch {
            setGrammars([]);
        }
    }, []);

    const loadQuestions = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setLoading(true);
            setPageError('');
            const res = await adminListGrammarQuiz({
                grammar_pattern_id: grammarFilter || undefined,
                hsk_level: hskFilter || undefined,
                page,
                limit: 20,
            });
            setQuestions(res.rows);
            setTotal(res.pagination.total);
            setTotalPages(res.pagination.totalPages);
        } catch (e) {
            setPageError(e instanceof Error ? e.message : 'Lỗi tải danh sách');
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, grammarFilter, hskFilter, page]);

    useEffect(() => { loadGrammars(); }, [loadGrammars]);
    useEffect(() => { loadQuestions(); }, [loadQuestions]);

    // Reset page when filters change.
    useEffect(() => { setPage(1); }, [grammarFilter, hskFilter]);

    // -------- Modal handlers --------
    const openCreate = () => {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            grammar_pattern_id: grammarFilter || '',
        });
        setGrammarSearchText('');
        setGrammarPickerHsk(hskFilter ? String(hskFilter) : '');
        setFormError('');
        setModalOpen(true);
    };

    const openEdit = (q: AdminGrammarQuizQuestion) => {
        const opts = q.options.length === 4 ? q.options : [...q.options, '', '', '', ''].slice(0, 4);
        const correctIdx = Math.max(0, opts.findIndex(o => String(o) === String(q.correct_answer)));
        setEditingId(q.id);
        setForm({
            grammar_pattern_id: q.grammar_pattern_id,
            question_text: q.question_text,
            options: [opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || ''],
            correct_index: correctIdx,
            explanation: q.explanation || '',
        });
        setGrammarSearchText('');
        setGrammarPickerHsk(String(q.hsk_level));
        setFormError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
    };

    const updateOption = (idx: number, value: string) => {
        setForm(f => {
            const next = [...f.options] as [string, string, string, string];
            next[idx] = value;
            return { ...f, options: next };
        });
    };

    const validate = (): string | null => {
        if (!form.grammar_pattern_id) return 'Chọn điểm ngữ pháp';
        if (!form.question_text.trim()) return 'Nhập đề bài';
        if (form.options.some(o => !o.trim())) return 'Cả 4 lựa chọn phải có nội dung';
        const unique = new Set(form.options.map(o => o.trim()));
        if (unique.size < 4) return '4 lựa chọn phải khác nhau';
        if (form.correct_index < 0 || form.correct_index > 3) return 'Chọn đáp án đúng';
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) { setFormError(err); return; }
        const payload: AdminGrammarQuizPayload = {
            grammar_pattern_id: Number(form.grammar_pattern_id),
            question_type: 'multiple_choice',
            question_text: form.question_text.trim(),
            options: form.options.map(o => o.trim()),
            correct_answer: form.options[form.correct_index].trim(),
            explanation: form.explanation.trim() || undefined,
            points: 1,
        };
        setSaving(true);
        setFormError('');
        try {
            if (editingId) {
                await adminUpdateGrammarQuiz(editingId, payload);
            } else {
                await adminCreateGrammarQuiz(payload);
            }
            setModalOpen(false);
            await loadQuestions();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Lỗi lưu câu hỏi');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (q: AdminGrammarQuizQuestion) => {
        if (!confirm(`Xóa câu hỏi #${q.id}?\n\n"${q.question_text.slice(0, 80)}"`)) return;
        try {
            await adminDeleteGrammarQuiz(q.id);
            await loadQuestions();
        } catch (e) {
            setPageError(e instanceof Error ? e.message : 'Không xóa được');
        }
    };

    if (authLoading) {
        return <div className="p-8 text-center text-[var(--text-muted)]">Đang kiểm tra phiên đăng nhập…</div>;
    }
    if (!isAuthenticated) {
        return (
            <div className="p-8 text-center text-[var(--text-muted)]">
                Cần đăng nhập admin. Vào <a href="/admin/login" className="text-[var(--primary)] underline">/admin/login</a>.
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Trắc nghiệm ngữ pháp</h1>
                    <p className="text-[var(--text-muted)] text-sm">Tổng cộng {total.toLocaleString()} câu hỏi</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm câu hỏi
                </Button>
            </div>

            {pageError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                    {pageError}
                </div>
            )}

            {/* Filters */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[260px]">
                    <select
                        value={grammarFilter || ''}
                        onChange={e => setGrammarFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                    >
                        <option value="">Tất cả ngữ pháp</option>
                        {grammars.map(g => (
                            <option key={g.id} value={g.id}>
                                #{g.id} — {g.grammarPoint} (HSK {g.hskLevel})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setHskFilter(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!hskFilter ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                    >
                        Tất cả
                    </button>
                    {HSK_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => setHskFilter(level)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hskFilter === level ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                        >
                            HSK {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">Đang tải…</div>
                ) : questions.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">Không có câu hỏi nào khớp bộ lọc.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                            <tr className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Ngữ pháp</th>
                                <th className="px-4 py-3">HSK</th>
                                <th className="px-4 py-3">Loại</th>
                                <th className="px-4 py-3">Đề bài</th>
                                <th className="px-4 py-3">Đáp án đúng</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {questions.map(q => (
                                <tr key={q.id} className="hover:bg-[var(--background)] transition-colors">
                                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">{q.id}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-[var(--text-main)] max-w-[180px] truncate">
                                        {q.grammar_point}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`${HSK_COLORS[q.hsk_level] || 'bg-gray-500'} text-white text-xs font-bold px-2 py-0.5 rounded`}>
                                            {q.hsk_level}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{TYPE_LABEL[q.question_type] || q.question_type}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--text-main)] max-w-[320px] truncate">{q.question_text}</td>
                                    <td className="px-4 py-3 text-sm text-emerald-500 max-w-[160px] truncate">{q.correct_answer}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(q)} className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 transition-colors" title="Sửa">
                                                <Icon name="edit" size="sm" />
                                            </button>
                                            <button onClick={() => handleDelete(q)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors" title="Xóa">
                                                <Icon name="delete" size="sm" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--border)]"
                    >
                        <Icon name="chevron_left" size="sm" />
                    </button>
                    <span className="text-sm text-[var(--text-secondary)]">Trang {page} / {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--border)]"
                    >
                        <Icon name="chevron_right" size="sm" />
                    </button>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={closeModal}>
                    <div
                        className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[var(--text-main)]">
                                {editingId ? `Sửa câu hỏi #${editingId}` : 'Thêm câu hỏi mới'}
                            </h2>
                            <button onClick={closeModal} disabled={saving} className="text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-50">
                                <Icon name="close" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Grammar selector */}
                            <div>
                                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Điểm ngữ pháp *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 mb-2">
                                    <div className="relative">
                                        <Icon name="search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="search"
                                            value={grammarSearchText}
                                            onChange={e => setGrammarSearchText(e.target.value)}
                                            placeholder="Tìm tên, công thức hoặc ID..."
                                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                        />
                                    </div>
                                    <select
                                        value={grammarPickerHsk}
                                        onChange={e => setGrammarPickerHsk(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                    >
                                        <option value="">Tất cả HSK</option>
                                        {HSK_LEVELS.map(level => (
                                            <option key={level} value={level}>HSK {level}</option>
                                        ))}
                                    </select>
                                </div>
                                <select
                                    value={form.grammar_pattern_id}
                                    onChange={e => setForm(f => ({ ...f, grammar_pattern_id: e.target.value ? parseInt(e.target.value, 10) : '' }))}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                >
                                    <option value="">— Chọn ngữ pháp —</option>
                                    {grammarPickerOptions.map(g => (
                                        <option key={g.id} value={g.id}>
                                            #{g.id} — {g.grammarPoint} (HSK {g.hskLevel})
                                        </option>
                                    ))}
                                    {grammarPickerOptions.length === 0 && (
                                        <option value="" disabled>Không có ngữ pháp phù hợp</option>
                                    )}
                                </select>
                                {form.grammar_pattern_id && grammarById.get(Number(form.grammar_pattern_id))?.patternFormula && (
                                    <p className="text-xs text-[var(--primary)] font-mono mt-1">
                                        {grammarById.get(Number(form.grammar_pattern_id))?.patternFormula}
                                    </p>
                                )}
                            </div>

                            {/* Question text */}
                            <div>
                                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Đề bài *</label>
                                <textarea
                                    value={form.question_text}
                                    onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                                    rows={3}
                                    placeholder="Vd: Chọn từ điền vào chỗ trống: 我___学生。"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none resize-y"
                                />
                            </div>

                            {/* Options + correct radio */}
                            <div>
                                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">4 lựa chọn * (chấm chọn đáp án đúng)</label>
                                <div className="space-y-2">
                                    {form.options.map((opt, i) => (
                                        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${form.correct_index === i ? 'border-emerald-500 bg-emerald-500/5' : 'border-[var(--border)]'}`}>
                                            <input
                                                type="radio"
                                                name="correct"
                                                checked={form.correct_index === i}
                                                onChange={() => setForm(f => ({ ...f, correct_index: i }))}
                                                className="accent-emerald-500"
                                            />
                                            <span className="text-xs font-bold text-[var(--text-muted)] w-5">{String.fromCharCode(65 + i)}.</span>
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={e => updateOption(i, e.target.value)}
                                                placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                                                className="flex-1 px-2 py-1 rounded bg-transparent text-[var(--text-main)] focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Explanation */}
                            <div>
                                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Giải thích (tiếng Việt)</label>
                                <textarea
                                    value={form.explanation}
                                    onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                                    rows={2}
                                    placeholder="Giải thích vì sao đáp án đúng…"
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none resize-y"
                                />
                            </div>

                            {formError && (
                                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                                    {formError}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-4 flex justify-end gap-3">
                            <Button variant="secondary" onClick={closeModal} disabled={saving}>Hủy</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Đang lưu…' : editingId ? 'Cập nhật' : 'Tạo câu hỏi'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function GrammarQuizAdminPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-[var(--text-muted)]">Đang tải…</div>}>
            <GrammarQuizAdminInner />
        </Suspense>
    );
}
