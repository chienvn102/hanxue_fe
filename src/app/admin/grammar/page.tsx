'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Example {
    chinese: string;
    pinyin: string;
    vietnamese: string;
}

interface Grammar {
    id: number;
    pattern: string[];
    patternPinyin?: string[];
    patternFormula?: string;
    grammarPoint: string;
    explanation: string;
    examples: Example[];
    hskLevel: number;
    audioUrl?: string;
}

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];
const HSK_COLORS: { [key: number]: string } = {
    1: 'bg-green-500',
    2: 'bg-blue-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-500',
    6: 'bg-purple-500',
};

export default function AdminGrammarPage() {
    const { token } = useAdminAuth();
    const [grammars, setGrammars] = useState<Grammar[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [hskFilter, setHskFilter] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGrammar, setEditingGrammar] = useState<Grammar | null>(null);
    const [formData, setFormData] = useState({
        pattern_formula: '',
        grammar_point: '',
        explanation: '',
        hsk_level: 1,
        examples: [{ chinese: '', pinyin: '', vietnamese: '' }] as Example[]
    });

    const fetchGrammars = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: page.toString(), limit: '20' });
            if (searchQuery) params.set('q', searchQuery);
            if (hskFilter) params.set('hsk', hskFilter.toString());

            const res = await fetch(`${API_BASE}/api/grammar?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            setGrammars(data.data || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotal(data.pagination?.total || 0);
        } catch (error) {
            console.error('Failed to fetch grammar', error);
        } finally {
            setLoading(false);
        }
    }, [token, page, searchQuery, hskFilter]);

    useEffect(() => {
        if (token) fetchGrammars();
    }, [fetchGrammars, token]);

    const openCreateModal = () => {
        setEditingGrammar(null);
        setFormData({
            pattern_formula: '',
            grammar_point: '',
            explanation: '',
            hsk_level: 1,
            examples: [{ chinese: '', pinyin: '', vietnamese: '' }]
        });
        setIsModalOpen(true);
    };

    const openEditModal = (grammar: Grammar) => {
        setEditingGrammar(grammar);
        setFormData({
            pattern_formula: grammar.patternFormula || '',
            grammar_point: grammar.grammarPoint,
            explanation: grammar.explanation,
            hsk_level: grammar.hskLevel,
            examples: grammar.examples?.length > 0 ? grammar.examples : [{ chinese: '', pinyin: '', vietnamese: '' }]
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Build pattern from formula
            const patternParts = formData.pattern_formula.split(/(\s*\+\s*)/).filter(Boolean);
            const pattern = patternParts.map(p => p.trim());

            const payload = {
                pattern,
                pattern_formula: formData.pattern_formula,
                grammar_point: formData.grammar_point,
                explanation: formData.explanation,
                hsk_level: formData.hsk_level,
                examples: formData.examples.filter(ex => ex.chinese.trim())
            };

            const url = editingGrammar
                ? `${API_BASE}/api/grammar/${editingGrammar.id}`
                : `${API_BASE}/api/grammar`;
            const method = editingGrammar ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                fetchGrammars();
            } else {
                alert(data.message || 'Lỗi khi lưu ngữ pháp');
            }
        } catch (error) {
            console.error('Save error', error);
            alert('Lỗi kết nối server');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bạn có chắc muốn xóa ngữ pháp này?')) return;

        try {
            const res = await fetch(`${API_BASE}/api/grammar/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchGrammars();
            } else {
                alert(data.message || 'Lỗi khi xóa');
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const addExample = () => {
        setFormData({
            ...formData,
            examples: [...formData.examples, { chinese: '', pinyin: '', vietnamese: '' }]
        });
    };

    const removeExample = (index: number) => {
        setFormData({
            ...formData,
            examples: formData.examples.filter((_, i) => i !== index)
        });
    };

    const updateExample = (index: number, field: keyof Example, value: string) => {
        const newExamples = [...formData.examples];
        newExamples[index] = { ...newExamples[index], [field]: value };
        setFormData({ ...formData, examples: newExamples });
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Quản lý Ngữ pháp</h1>
                    <p className="text-[var(--text-muted)] text-sm">Tổng cộng {total.toLocaleString()} mẫu ngữ pháp</p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm Ngữ pháp
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Tìm kiếm (tên, công thức, giải thích...)"
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setHskFilter(null); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!hskFilter ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                    >
                        Tất cả
                    </button>
                    {HSK_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => { setHskFilter(level); setPage(1); }}
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
                    <div className="p-8 text-center text-[var(--text-muted)]">Đang tải...</div>
                ) : grammars.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">Không tìm thấy ngữ pháp nào.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                            <tr className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Điểm Ngữ pháp</th>
                                <th className="px-4 py-3">Công thức</th>
                                <th className="px-4 py-3">HSK</th>
                                <th className="px-4 py-3">Ví dụ</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {grammars.map(grammar => (
                                <tr key={grammar.id} className="hover:bg-[var(--background)] transition-colors">
                                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">{grammar.id}</td>
                                    <td className="px-4 py-3 font-semibold text-[var(--text-main)]">{grammar.grammarPoint}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--primary)] font-mono">{grammar.patternFormula}</td>
                                    <td className="px-4 py-3">
                                        <span className={`${HSK_COLORS[grammar.hskLevel]} text-white text-xs font-bold px-2 py-0.5 rounded`}>
                                            {grammar.hskLevel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                                        {grammar.examples?.length || 0} ví dụ
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(grammar)} className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 transition-colors">
                                                <Icon name="edit" size="sm" />
                                            </button>
                                            <button onClick={() => handleDelete(grammar.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors">
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

            {/* Edit/Create Modal — flex column: header / scrollable body / fixed footer */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--surface)] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header — fixed */}
                        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-main)]">
                                    {editingGrammar ? 'Chỉnh sửa Ngữ pháp' : 'Thêm Ngữ pháp Mới'}
                                </h2>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {editingGrammar ? `ID #${editingGrammar.id}` : 'Điền thông tin để tạo điểm ngữ pháp mới'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)] transition-colors"
                            >
                                <Icon name="close" />
                            </button>
                        </div>

                        {/* Form — flex 1, contains scrollable body + fixed footer */}
                        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                            {/* Scrollable body */}
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                                {/* Row 1: Grammar Point + HSK Level */}
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">
                                            Điểm ngữ pháp <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text" required
                                            placeholder="Cấu trúc 很 + Tính từ"
                                            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                            value={formData.grammar_point}
                                            onChange={e => setFormData({ ...formData, grammar_point: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">
                                            HSK <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                            value={formData.hsk_level}
                                            onChange={e => setFormData({ ...formData, hsk_level: parseInt(e.target.value) })}
                                        >
                                            {HSK_LEVELS.map(l => <option key={l} value={l}>HSK {l}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Pattern Formula */}
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">
                                        Công thức <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text" required
                                        placeholder="S + 很 + Adj"
                                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] font-mono focus:border-[var(--primary)] outline-none"
                                        value={formData.pattern_formula}
                                        onChange={e => setFormData({ ...formData, pattern_formula: e.target.value })}
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Dùng dấu + để phân tách các thành phần</p>
                                </div>

                                {/* Explanation */}
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">
                                        Giải thích <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required rows={3}
                                        placeholder="Giải thích cách sử dụng, ngữ cảnh áp dụng..."
                                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none resize-y"
                                        value={formData.explanation}
                                        onChange={e => setFormData({ ...formData, explanation: e.target.value })}
                                    />
                                </div>

                                {/* Examples */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-semibold text-[var(--text-main)]">
                                            Ví dụ minh họa <span className="text-[var(--text-muted)] font-normal">({formData.examples.length})</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addExample}
                                            className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                                        >
                                            <Icon name="add" size="xs" /> Thêm ví dụ
                                        </button>
                                    </div>
                                    <div className="space-y-2.5">
                                        {formData.examples.map((ex, idx) => (
                                            <div key={idx} className="p-3 border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Ví dụ #{idx + 1}</span>
                                                    {formData.examples.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeExample(idx)}
                                                            className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-500/10"
                                                            title="Xóa ví dụ này"
                                                        >
                                                            <Icon name="close" size="xs" />
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Tiếng Trung (ví dụ: 我很好)"
                                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] text-base hanzi focus:border-[var(--primary)] outline-none"
                                                    value={ex.chinese}
                                                    onChange={e => updateExample(idx, 'chinese', e.target.value)}
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Pinyin (wǒ hěn hǎo)"
                                                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--primary)] focus:border-[var(--primary)] outline-none"
                                                        value={ex.pinyin}
                                                        onChange={e => updateExample(idx, 'pinyin', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Nghĩa tiếng Việt (Tôi khỏe)"
                                                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                                                        value={ex.vietnamese}
                                                        onChange={e => updateExample(idx, 'vietnamese', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer — outside scroll area, always visible */}
                            <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3 shrink-0 bg-[var(--surface)]">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">
                                    Hủy
                                </Button>
                                <Button type="submit" className="flex-1">
                                    {editingGrammar ? 'Lưu thay đổi' : 'Tạo Ngữ pháp'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
