'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
    const [formError, setFormError] = useState<string>('');
    const [saving, setSaving] = useState(false);
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
    const [generatingAudio, setGeneratingAudio] = useState(false);
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
                // Prefer canonical short reference (gs://… or /uploads/…) to
                // avoid bloating vocabulary.audio_url (VARCHAR 255). Signed
                // URLs (data.url) can exceed 600 chars and get truncated.
                setFormData(prev => ({ ...prev, audio_url: data.ref || data.url }));
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

    /**
     * Gen audio AI:
     * - Khi đang sửa (có editingVocab.id): gọi /api/admin/vocab/:id/gen-audio
     *   → BE đọc simplified từ DB, gen TTS, UPDATE audio_url của vocab đó luôn.
     * - Khi đang tạo mới: cần formData.simplified, gọi /api/admin/gen-audio-text
     *   → BE chỉ gen audio dựa trên text, trả URL → admin save vocab sau.
     */
    const handleGenerateAudio = async (engine: 'cloud' | 'edge' = 'cloud') => {
        const word = formData.simplified.trim();
        if (!editingVocab && !word) {
            alert('Vui lòng nhập chữ giản thể trước khi tạo audio.');
            return;
        }
        setGeneratingAudio(true);
        try {
            const suffix = engine === 'edge' ? '-edge' : '';
            const endpoint = editingVocab
                ? `${API_BASE}/api/admin/vocab/${editingVocab.id}/gen-audio${suffix}`
                : `${API_BASE}/api/admin/gen-audio-text${suffix}`;
            const init: RequestInit = {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            };
            if (!editingVocab) {
                init.headers = { ...init.headers, 'Content-Type': 'application/json' };
                init.body = JSON.stringify({ text: word });
            }
            const res = await fetch(endpoint, init);
            const queued = await res.json();
            if (!res.ok || !queued.jobId) throw new Error(queued.message || 'Tao audio that bai');

            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const statusRes = await fetch(`${API_BASE}/api/admin/jobs/${queued.jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const status = await statusRes.json();
                if (status.status === 'done' && status.url) {
                    // FE giữ playable URL để preview; handleSave sẽ normalize
                    // về canonical (gs:// hoặc /audio/...) trước khi POST.
                    setFormData(prev => ({ ...prev, audio_url: status.url }));
                    return;
                }
                if (status.status === 'failed') throw new Error(status.error || 'Tao audio that bai');
            }
            throw new Error('Tao audio qua lau, vui long thu lai');
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Tao audio that bai');
        } finally {
            setGeneratingAudio(false);
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
        setFormError('');
        setFormData({
            simplified: '', traditional: '', pinyin: '', han_viet: '',
            meaning_vi: '', meaning_en: '', hsk_level: 1, word_type: '', audio_url: '', examples: []
        });
        setIsModalOpen(true);
    };

    const openEditModal = (vocab: Vocab) => {
        setEditingVocab(vocab);
        setFormError('');
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

    /**
     * Convert signed GCS URLs (long, transient) to canonical `gs://bucket/object`
     * before sending to BE — mirrors the BE `normalizeAudioRef`. Keeps
     * `/audio/...`, `/uploads/...`, and unknown URLs intact.
     */
    const normalizeAudioUrlForStorage = (raw: string): string => {
        if (!raw) return '';
        if (raw.startsWith('gs://') || raw.startsWith('/audio') || raw.startsWith('/uploads')) {
            return raw;
        }
        // storage.googleapis.com/<bucket>/<object>?... → gs://<bucket>/<object>
        const m1 = raw.match(/^https?:\/\/storage\.googleapis\.com\/([^/?#]+)\/([^?#]+)/i);
        if (m1) return `gs://${m1[1]}/${decodeURIComponent(m1[2])}`;
        // <bucket>.storage.googleapis.com/<object>?... → gs://<bucket>/<object>
        const m2 = raw.match(/^https?:\/\/([^./]+)\.storage\.googleapis\.com\/([^?#]+)/i);
        if (m2) return `gs://${m2[1]}/${decodeURIComponent(m2[2])}`;
        return raw;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        // Trim các field text trước khi submit (whitespace gây trùng giả).
        // audio_url normalize sang canonical (gs:// hoặc relative path) để
        // không vượt VARCHAR(255) khi signed URL dài hơn 600 ký tự.
        const payload = {
            ...formData,
            simplified: formData.simplified.trim(),
            traditional: formData.traditional.trim(),
            pinyin: formData.pinyin.trim(),
            han_viet: formData.han_viet.trim(),
            meaning_vi: formData.meaning_vi.trim(),
            meaning_en: formData.meaning_en.trim(),
            word_type: formData.word_type.trim(),
            audio_url: normalizeAudioUrlForStorage(formData.audio_url),
        };

        if (!payload.simplified || !payload.pinyin || !payload.meaning_vi) {
            setFormError('Vui lòng điền đủ Chữ giản thể, Pinyin, Nghĩa tiếng Việt.');
            return;
        }

        setSaving(true);
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
                body: JSON.stringify(payload)
            });

            // Body có thể không phải JSON khi nginx/Cloudflare trả HTML.
            const ct = res.headers.get('content-type') || '';
            const data = ct.includes('application/json')
                ? await res.json().catch(() => ({}))
                : { success: false, message: `HTTP ${res.status}: ${res.statusText}` };

            if (res.ok && data.success) {
                setIsModalOpen(false);
                fetchVocabs();
                return;
            }

            // Duplicate — show in form (không alert) và hỏi xem có muốn mở bản ghi cũ.
            if (res.status === 409 && data.code === 'DUPLICATE_SIMPLIFIED') {
                const existingId = data.data?.existingId;
                setFormError(data.message || 'Chữ Hán đã tồn tại.');
                if (existingId && confirm(`${data.message}\n\nMở chỉnh sửa từ vựng cũ (id ${existingId})?`)) {
                    // Nạp bản ghi cũ vào modal để admin sửa thẳng
                    try {
                        const r = await fetch(`${API_BASE}/api/vocab/${existingId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const v = await r.json();
                        if (v && v.id) {
                            setEditingVocab({
                                id: v.id, simplified: v.simplified, traditional: v.traditional,
                                pinyin: v.pinyin, hanViet: v.hanViet, meaningVi: v.meaningVi,
                                meaningEn: v.meaningEn, hskLevel: v.hskLevel, wordType: v.wordType,
                                audioUrl: v.audioUrl, examples: v.examples
                            });
                            setFormData({
                                simplified: v.simplified || '',
                                traditional: v.traditional || '',
                                pinyin: v.pinyin || '',
                                han_viet: v.hanViet || '',
                                meaning_vi: v.meaningVi || '',
                                meaning_en: v.meaningEn || '',
                                hsk_level: v.hskLevel || 1,
                                word_type: v.wordType || '',
                                audio_url: v.audioUrl || '',
                                examples: v.examples || []
                            });
                            setFormError('');
                        }
                    } catch (loadErr) {
                        console.error('Load existing vocab error', loadErr);
                    }
                }
                return;
            }

            // Log đầy đủ để debug khi save fail mà message generic.
            console.error('[vocab save] failed', {
                status: res.status,
                response: data,
                sentPayload: payload,
            });
            setFormError(data.message || data.error || `Lỗi khi lưu từ vựng (HTTP ${res.status}). Xem Console để biết chi tiết.`);
        } catch (error) {
            console.error('Save error', error);
            setFormError('Mất kết nối tới server. Kiểm tra mạng hoặc thử lại.');
        } finally {
            setSaving(false);
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
                return;
            }
            // 409 VOCAB_IN_USE: từ đang ở notebook / flashcard / lesson.
            // Cho phép user confirm force delete → cascade xóa kèm reference.
            if (res.status === 409 && data.code === 'VOCAB_IN_USE') {
                const ref = data.data || {};
                const parts: string[] = [];
                if (ref.notebookCnt) parts.push(`${ref.notebookCnt} sổ tay`);
                if (ref.flashcardCnt) parts.push(`${ref.flashcardCnt} flashcard`);
                if (ref.lessonCnt) parts.push(`${ref.lessonCnt} bài học`);
                const refText = parts.join(', ');
                const forceConfirm = confirm(
                    `Từ vựng đang được dùng ở: ${refText}.\n\n` +
                    `Bấm OK để XOÁ KÈM (xóa luôn entry trong các nơi đang dùng).\n` +
                    `Bấm Cancel để giữ lại.`
                );
                if (!forceConfirm) return;
                const forceRes = await fetch(`${API_BASE}/api/vocab/${id}?force=true`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const forceData = await forceRes.json();
                if (forceData.success) {
                    fetchVocabs();
                } else {
                    alert(forceData.message || 'Force xóa thất bại');
                }
                return;
            }
            alert(data.message || 'Lỗi khi xóa');
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
                            {formError && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-start gap-2">
                                    <Icon name="error_outline" size="sm" className="mt-0.5 flex-shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Chữ giản thể *</label>
                                    <input
                                        type="text" required
                                        className="w-full px-3 py-2 border rounded-lg bg-[var(--surface)] text-[var(--text-main)] text-2xl font-bold"
                                        value={formData.simplified}
                                        onChange={e => { setFormData({ ...formData, simplified: e.target.value }); if (formError) setFormError(''); }}
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
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Hán Việt (không bắt buộc)</label>
                                    <input
                                        type="text"
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
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateAudio('cloud')}
                                            disabled={generatingAudio || uploading || !formData.simplified.trim()}
                                            title={!formData.simplified.trim() ? 'Nhập chữ giản thể trước' : 'Tạo audio bằng Google Cloud TTS (chất lượng cao, có phí)'}
                                            className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                        >
                                            <Icon name="graphic_eq" size="sm" />
                                            {generatingAudio ? 'Đang tạo...' : 'AI'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateAudio('edge')}
                                            disabled={generatingAudio || uploading || !formData.simplified.trim()}
                                            title={!formData.simplified.trim() ? 'Nhập chữ giản thể trước' : 'Tạo audio bằng Microsoft Edge TTS (miễn phí, local)'}
                                            className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                        >
                                            <Icon name="record_voice_over" size="sm" />
                                            {generatingAudio ? 'Đang tạo...' : 'Edge'}
                                        </button>
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
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>
                                    Hủy
                                </Button>
                                <Button type="submit" className="flex-1" disabled={saving}>
                                    {saving ? 'Đang lưu...' : editingVocab ? 'Lưu thay đổi' : 'Tạo Từ vựng'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
