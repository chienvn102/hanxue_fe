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
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Ngữ pháp</h1>
                    <p className="text-gray-500 text-sm">Tổng cộng {total.toLocaleString()} mẫu ngữ pháp</p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm Ngữ pháp
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Tìm kiếm (tên, công thức, giải thích...)"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:border-[var(--primary)] outline-none"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setHskFilter(null); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!hskFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Tất cả
                    </button>
                    {HSK_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => { setHskFilter(level); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hskFilter === level ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            HSK {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Đang tải...</div>
                ) : grammars.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Không tìm thấy ngữ pháp nào.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Điểm Ngữ pháp</th>
                                <th className="px-4 py-3">Công thức</th>
                                <th className="px-4 py-3">HSK</th>
                                <th className="px-4 py-3">Ví dụ</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {grammars.map(grammar => (
                                <tr key={grammar.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{grammar.id}</td>
                                    <td className="px-4 py-3 font-semibold text-gray-900">{grammar.grammarPoint}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--primary)] font-mono">{grammar.patternFormula}</td>
                                    <td className="px-4 py-3">
                                        <span className={`${HSK_COLORS[grammar.hskLevel]} text-white text-xs font-bold px-2 py-0.5 rounded`}>
                                            {grammar.hskLevel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {grammar.examples?.length || 0} ví dụ
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(grammar)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                                <Icon name="edit" size="sm" />
                                            </button>
                                            <button onClick={() => handleDelete(grammar.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
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
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                    >
                        <Icon name="chevron_left" size="sm" />
                    </button>
                    <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                    >
                        <Icon name="chevron_right" size="sm" />
                    </button>
                </div>
            )}

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-8">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingGrammar ? 'Chỉnh sửa Ngữ pháp' : 'Thêm Ngữ pháp Mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Icon name="close" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Grammar Point */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Điểm ngữ pháp *</label>
                                <input
                                    type="text" required
                                    placeholder="Ví dụ: Cấu trúc 很 + Tính từ"
                                    className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900"
                                    value={formData.grammar_point}
                                    onChange={e => setFormData({ ...formData, grammar_point: e.target.value })}
                                />
                            </div>

                            {/* Pattern Formula */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Công thức *</label>
                                <input
                                    type="text" required
                                    placeholder="Ví dụ: S + 很 + Adj"
                                    className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 font-mono"
                                    value={formData.pattern_formula}
                                    onChange={e => setFormData({ ...formData, pattern_formula: e.target.value })}
                                />
                                <p className="text-xs text-gray-400 mt-1">Dùng dấu + để phân tách các thành phần</p>
                            </div>

                            {/* HSK Level */}
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">HSK Level *</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900"
                                    value={formData.hsk_level}
                                    onChange={e => setFormData({ ...formData, hsk_level: parseInt(e.target.value) })}
                                >
                                    {HSK_LEVELS.map(l => <option key={l} value={l}>HSK {l}</option>)}
                                </select>
                            </div>

                            {/* Explanation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Giải thích *</label>
                                <textarea
                                    required rows={4}
                                    placeholder="Giải thích cách sử dụng, ngữ cảnh áp dụng..."
                                    className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900"
                                    value={formData.explanation}
                                    onChange={e => setFormData({ ...formData, explanation: e.target.value })}
                                />
                            </div>

                            {/* Examples */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ví dụ minh họa</label>
                                <div className="space-y-3">
                                    {formData.examples.map((ex, idx) => (
                                        <div key={idx} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                                                {formData.examples.length > 1 && (
                                                    <button type="button" onClick={() => removeExample(idx)} className="ml-auto text-red-400 hover:text-red-600">
                                                        <Icon name="close" size="sm" />
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Tiếng Trung (Ví dụ: 我很好)"
                                                className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 text-lg"
                                                value={ex.chinese}
                                                onChange={e => updateExample(idx, 'chinese', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Pinyin (Ví dụ: wǒ hěn hǎo)"
                                                className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 text-[var(--primary)]"
                                                value={ex.pinyin}
                                                onChange={e => updateExample(idx, 'pinyin', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Nghĩa tiếng Việt (Ví dụ: Tôi khỏe)"
                                                className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900"
                                                value={ex.vietnamese}
                                                onChange={e => updateExample(idx, 'vietnamese', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addExample}
                                    className="mt-3 text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
                                >
                                    <Icon name="add" size="sm" /> Thêm ví dụ
                                </button>
                            </div>

                            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2">
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
