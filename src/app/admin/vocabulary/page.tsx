'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Vocab {
    id: number;
    simplified: string;
    traditional?: string;
    pinyin: string;
    hanViet: string;
    meaningVi: string;
    meaningEn?: string;
    hskLevel: number;
    wordType?: string;
    audioUrl?: string;
    frequencyRank?: number;
    examples?: { chinese: string; pinyin: string; vietnamese: string }[];
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

export default function AdminVocabularyPage() {
    const { token } = useAdminAuth();
    const [vocabs, setVocabs] = useState<Vocab[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [hskFilter, setHskFilter] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVocab, setEditingVocab] = useState<Vocab | null>(null);
    const [formData, setFormData] = useState({
        simplified: '',
        traditional: '',
        pinyin: '',
        han_viet: '',
        meaning_vi: '',
        meaning_en: '',
        hsk_level: 1,
        word_type: '',
        audio_url: '',
        examples: [] as { chinese: string; pinyin: string; vietnamese: string }[]
    });

    // Audio preview by word - using same logic as main page (cmn-{word}.mp3) with TTS fallback
    const playAudioByWord = (word: string) => {
        if (!word) return;
        const audioUrl = `${API_BASE}/audio/cmn-${encodeURIComponent(word)}.mp3`;
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {
            // Fallback: Browser TTS
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'zh-CN';
                utterance.rate = 0.8;
                speechSynthesis.speak(utterance);
            }
        });
    };

    // Audio preview from custom URL (for modal preview)
    const playAudioPreview = (url: string) => {
        if (!url) return;
        let audioUrl = url;
        if (url.startsWith('/audio') || url.startsWith('/uploads')) {
            audioUrl = `${API_BASE}${url}`;
        }
        const audio = new Audio(audioUrl);
        audio.play().catch(() => alert('Không thể phát audio từ URL này.'));
    };

    // Audio upload
    const [uploading, setUploading] = useState(false);
    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('audio', file);

            const res = await fetch(`${API_BASE}/api/upload/audio`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            });

            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, audio_url: data.url }));
            } else {
                alert(data.message || 'Upload thất bại');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Lỗi kết nối server');
        } finally {
            setUploading(false);
        }
    };

    const fetchVocabs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            if (searchQuery) params.set('q', searchQuery);
            if (hskFilter) params.set('hsk', hskFilter.toString());

            const res = await fetch(`${API_BASE}/api/vocab?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            setVocabs(data.data || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotal(data.pagination?.total || 0);
        } catch (error) {
            console.error('Failed to fetch vocabulary', error);
        } finally {
            setLoading(false);
        }
    }, [token, page, searchQuery, hskFilter]);

    useEffect(() => {
        if (token) fetchVocabs();
    }, [fetchVocabs, token]);

    const openCreateModal = () => {
        setEditingVocab(null);
        setFormData({
            simplified: '', traditional: '', pinyin: '', han_viet: '',
            meaning_vi: '', meaning_en: '', hsk_level: 1, word_type: '', audio_url: '', examples: []
        });
        setIsModalOpen(true);
    };

    const openEditModal = (vocab: Vocab) => {
        setEditingVocab(vocab);
        setFormData({
            simplified: vocab.simplified,
            traditional: vocab.traditional || '',
            pinyin: vocab.pinyin,
            han_viet: vocab.hanViet,
            meaning_vi: vocab.meaningVi,
            meaning_en: vocab.meaningEn || '',
            hsk_level: vocab.hskLevel,
            word_type: vocab.wordType || '',
            audio_url: vocab.audioUrl || '',
            examples: vocab.examples || []
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingVocab
                ? `${API_BASE}/api/vocab/${editingVocab.id}`
                : `${API_BASE}/api/vocab`;
            const method = editingVocab ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                fetchVocabs();
            } else {
                alert(data.message || 'Lỗi khi lưu từ vựng');
            }
        } catch (error) {
            console.error('Save error', error);
            alert('Lỗi kết nối server');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bạn có chắc muốn xóa từ vựng này?')) return;

        try {
            const res = await fetch(`${API_BASE}/api/vocab/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchVocabs();
            } else {
                alert(data.message || 'Lỗi khi xóa');
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Quản lý Từ vựng</h1>
                    <p className="text-[var(--text-muted)] text-sm">Tổng cộng {total.toLocaleString()} từ vựng</p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                    <Icon name="add" />
                    Thêm Từ vựng
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Tìm kiếm (chữ Hán, pinyin, nghĩa...)"
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
                ) : vocabs.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">Không tìm thấy từ vựng nào.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                            <tr className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Chữ Hán</th>
                                <th className="px-4 py-3">Pinyin</th>
                                <th className="px-4 py-3">Hán Việt</th>
                                <th className="px-4 py-3">Nghĩa Việt</th>
                                <th className="px-4 py-3">HSK</th>
                                <th className="px-4 py-3 text-center">Audio</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {vocabs.map(vocab => (
                                <tr key={vocab.id} className="hover:bg-[var(--background)] transition-colors">
                                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">{vocab.id}</td>
                                    <td className="px-4 py-3 text-xl font-bold text-[var(--text-main)]">{vocab.simplified}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--primary)]">{vocab.pinyin}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--text-muted)] italic">{vocab.hanViet}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-xs truncate">{vocab.meaningVi}</td>
                                    <td className="px-4 py-3">
                                        <span className={`${HSK_COLORS[vocab.hskLevel]} text-white text-xs font-bold px-2 py-0.5 rounded`}>
                                            {vocab.hskLevel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => playAudioByWord(vocab.simplified)}
                                            className="p-1.5 bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-colors"
                                        >
                                            <Icon name="volume_up" size="sm" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(vocab)} className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 transition-colors">
                                                <Icon name="edit" size="sm" />
                                            </button>
                                            <button onClick={() => handleDelete(vocab.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors">
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

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-[var(--surface)] rounded-2xl w-full max-w-2xl shadow-2xl my-8">
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--surface)] rounded-t-2xl">
                            <h2 className="text-xl font-bold text-[var(--text-main)]">
                                {editingVocab ? 'Chỉnh sửa Từ vựng' : 'Thêm Từ vựng Mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                <Icon name="close" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Chữ giản thể *</label>
                                    <input
                                        type="text" required
                                        className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)] text-2xl font-bold"
                                        value={formData.simplified}
                                        onChange={e => setFormData({ ...formData, simplified: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Chữ phồn thể</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)] text-2xl font-bold"
                                        value={formData.traditional}
                                        onChange={e => setFormData({ ...formData, traditional: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Pinyin *</label>
                                    <input
                                        type="text" required
                                        className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)]"
                                        value={formData.pinyin}
                                        onChange={e => setFormData({ ...formData, pinyin: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Hán Việt *</label>
                                    <input
                                        type="text" required
                                        className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)] italic"
                                        value={formData.han_viet}
                                        onChange={e => setFormData({ ...formData, han_viet: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nghĩa tiếng Việt *</label>
                                <textarea
                                    required rows={2}
                                    className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)]"
                                    value={formData.meaning_vi}
                                    onChange={e => setFormData({ ...formData, meaning_vi: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nghĩa tiếng Anh</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)]"
                                    value={formData.meaning_en}
                                    onChange={e => setFormData({ ...formData, meaning_en: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">HSK Level *</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)]"
                                        value={formData.hsk_level}
                                        onChange={e => setFormData({ ...formData, hsk_level: parseInt(e.target.value) })}
                                    >
                                        {HSK_LEVELS.map(l => <option key={l} value={l}>HSK {l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Loại từ</label>
                                    <input
                                        type="text" placeholder="noun, verb, adj..."
                                        className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)]"
                                        value={formData.word_type}
                                        onChange={e => setFormData({ ...formData, word_type: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Audio Upload Field */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">File Audio</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <label className={`flex-1 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploading ? 'bg-[var(--surface-secondary)] border-[var(--border)]' : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5'}`}>
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={handleAudioUpload}
                                                disabled={uploading}
                                            />
                                            <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                                                <Icon name={uploading ? 'hourglass_empty' : 'upload'} size="sm" />
                                                <span className="text-sm">{uploading ? 'Đang tải lên...' : 'Chọn file audio (mp3, wav...)'}</span>
                                            </div>
                                        </label>
                                        {formData.audio_url && (
                                            <button
                                                type="button"
                                                onClick={() => playAudioPreview(formData.audio_url)}
                                                className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors flex items-center gap-1"
                                            >
                                                <Icon name="play_arrow" size="sm" /> Nghe
                                            </button>
                                        )}
                                    </div>
                                    {formData.audio_url && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-[var(--text-muted)] truncate flex-1">{formData.audio_url}</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, audio_url: '' })}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Icon name="close" size="sm" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 sticky bottom-0 bg-[var(--surface)] pb-2">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">
                                    Hủy
                                </Button>
                                <Button type="submit" className="flex-1">
                                    {editingVocab ? 'Lưu thay đổi' : 'Tạo Từ vựng'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
