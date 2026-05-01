'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type TabId = 'passage' | 'vocab' | 'grammar' | 'writing';

interface LessonMeta {
    id: number;
    course_id: number;
    title: string;
    description: string | null;
    passage_zh: string | null;
    passage_pinyin: string | null;
    passage_vi: string | null;
    passage_audio_url: string | null;
    objectives_vi: string | null;
    hsk_level: number | null;
    order_index: number;
    is_active: number | boolean;
}

interface VocabRow {
    id: number;
    link_id: number;
    order_index: number;
    note_vi: string | null;
    simplified: string;
    pinyin: string;
    meaning_vi: string;
    word_type: string | null;
}

interface GrammarRow {
    id: number;
    grammar_point: string;
    pattern_formula: string | null;
    explanation: string;
    hsk_level: number | null;
    order_index: number;
}

interface WritingRow {
    id: number;
    prompt_vi: string;
    prompt_zh: string | null;
    expected_keywords: string[];
    sample_answer_zh: string | null;
    sample_answer_pinyin: string | null;
    sample_answer_vi: string | null;
    min_chars: number;
    max_chars: number;
    order_index: number;
}

interface Payload {
    lesson: LessonMeta;
    vocabulary: VocabRow[];
    grammar: GrammarRow[];
    writingExercises: WritingRow[];
}

export default function LessonEditorPage() {
    const { token } = useAdminAuth();
    const params = useParams();
    const lessonId = params.id as string;

    const [payload, setPayload] = useState<Payload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('passage');

    const reload = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/textbook`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setPayload(data.data);
            } else {
                setError(data.message || 'Lỗi tải bài học');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi mạng');
        } finally {
            setLoading(false);
        }
    }, [lessonId, token]);

    useEffect(() => {
        if (lessonId && token) reload();
    }, [lessonId, token, reload]);

    if (loading) {
        return <div className="text-center py-12 text-[var(--text-muted)]">Đang tải...</div>;
    }
    if (error || !payload) {
        return (
            <div className="p-6 rounded-xl bg-red-500/10 text-red-400">
                {error || 'Không tải được bài học'}
            </div>
        );
    }

    const { lesson, vocabulary, grammar, writingExercises } = payload;

    const tabs: { id: TabId; label: string; icon: string; count?: number }[] = [
        { id: 'passage', label: 'Bài khoá', icon: 'menu_book' },
        { id: 'vocab', label: 'Từ vựng', icon: 'translate', count: vocabulary.length },
        { id: 'grammar', label: 'Ngữ pháp', icon: 'auto_stories', count: grammar.length },
        { id: 'writing', label: 'Bài tập viết', icon: 'edit_note', count: writingExercises.length },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/admin/courses/${lesson.course_id}/lessons`}
                    className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] transition-colors"
                >
                    <Icon name="arrow_back" />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-[var(--text-main)] truncate">{lesson.title}</h1>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">HSK {lesson.hsk_level || '?'}</span>
                        <span>•</span>
                        <span>Thứ tự #{lesson.order_index}</span>
                        <span>•</span>
                        <span className={lesson.passage_audio_url ? 'text-emerald-500' : 'text-amber-500'}>
                            {lesson.passage_audio_url ? 'Đã có audio' : 'Chưa có audio'}
                        </span>
                    </div>
                </div>
                <Link href={`/lessons/${lessonId}`} target="_blank">
                    <Button variant="outline" className="flex items-center gap-2">
                        <Icon name="open_in_new" size="sm" />
                        Xem trang user
                    </Button>
                </Link>
            </div>

            <div className="border-b border-[var(--border)]">
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === t.id
                                    ? 'border-[var(--primary)] text-[var(--primary)]'
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                        >
                            <Icon name={t.icon} size="sm" />
                            {t.label}
                            {t.count !== undefined && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--surface-secondary)] rounded-full">
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'passage' && (
                <PassageTab lesson={lesson} token={token} onSaved={reload} />
            )}
            {activeTab === 'vocab' && (
                <VocabTab lessonId={lessonId} items={vocabulary} hskLevel={lesson.hsk_level} token={token} onChanged={reload} />
            )}
            {activeTab === 'grammar' && (
                <GrammarTab lessonId={lessonId} items={grammar} hskLevel={lesson.hsk_level} token={token} onChanged={reload} />
            )}
            {activeTab === 'writing' && (
                <WritingTab lessonId={lessonId} items={writingExercises} token={token} onChanged={reload} />
            )}
        </div>
    );
}

// ============================== PASSAGE TAB ==============================

function PassageTab({
    lesson, token, onSaved,
}: { lesson: LessonMeta; token: string | null; onSaved: () => void }) {
    const [form, setForm] = useState({
        title: lesson.title,
        description: lesson.description || '',
        passage_zh: lesson.passage_zh || '',
        passage_pinyin: lesson.passage_pinyin || '',
        passage_vi: lesson.passage_vi || '',
        objectives_vi: lesson.objectives_vi || '',
        hsk_level: lesson.hsk_level || 1,
        order_index: lesson.order_index,
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (saving) return;
        try {
            setSaving(true);
            const res = await fetch(`${API_BASE}/api/lessons/${lesson.id}/textbook`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                onSaved();
                alert('Đã lưu');
            } else {
                alert(data.message || 'Lỗi lưu');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tiêu đề</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">HSK / Order</label>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none"
                            value={form.hsk_level}
                            onChange={e => setForm({ ...form, hsk_level: parseInt(e.target.value) })}
                        >
                            {[1, 2, 3, 4, 5, 6].map(lv => <option key={lv} value={lv}>HSK {lv}</option>)}
                        </select>
                        <input
                            type="number"
                            min={0}
                            className="w-20 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none"
                            value={form.order_index}
                            onChange={e => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mô tả ngắn</label>
                <textarea
                    rows={2}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mục tiêu (objectives_vi)</label>
                <textarea
                    rows={3}
                    placeholder="Sau bài này học viên có thể: ..."
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    value={form.objectives_vi}
                    onChange={e => setForm({ ...form, objectives_vi: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Bài khoá tiếng Trung (passage_zh)</label>
                <textarea
                    rows={8}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] hanzi text-base outline-none focus:border-[var(--primary)] font-mono"
                    value={form.passage_zh}
                    onChange={e => setForm({ ...form, passage_zh: e.target.value })}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    Dialogue dùng prefix "老师：" / "学生A：" — script TTS sẽ tự cắt khi sinh audio.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Pinyin (passage_pinyin)</label>
                <textarea
                    rows={6}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] italic font-mono text-sm"
                    value={form.passage_pinyin}
                    onChange={e => setForm({ ...form, passage_pinyin: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Bản dịch tiếng Việt (passage_vi)</label>
                <textarea
                    rows={6}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    value={form.passage_vi}
                    onChange={e => setForm({ ...form, passage_vi: e.target.value })}
                />
            </div>

            <div className="p-3 rounded-lg bg-[var(--background)] text-xs text-[var(--text-muted)]">
                <strong>Sinh audio passage:</strong> chạy từ máy local sau khi save:
                <pre className="mt-1 font-mono text-[10px]">cd C:\Users\chien\Documents\hanxue_db\audio_gen
python generate_lesson_audio.py --lesson-id {lesson.id} --force</pre>
                {lesson.passage_audio_url
                    ? <span className="text-emerald-500">✓ passage_audio_url = {lesson.passage_audio_url}</span>
                    : <span className="text-amber-500">⚠ Chưa có audio</span>}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    <Icon name={saving ? 'hourglass_top' : 'save'} size="sm" />
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
            </div>
        </div>
    );
}

// ============================== VOCAB TAB ==============================

interface VocabSearchHit {
    id: number;
    simplified: string;
    pinyin: string;
    meaning_vi: string;
    hsk_level: number | null;
    word_type: string | null;
}

function VocabTab({
    lessonId, items, hskLevel, token, onChanged,
}: { lessonId: string; items: VocabRow[]; hskLevel: number | null; token: string | null; onChanged: () => void }) {
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<VocabSearchHit[]>([]);
    const [searching, setSearching] = useState(false);
    const [editNoteId, setEditNoteId] = useState<number | null>(null);
    const [editNoteValue, setEditNoteValue] = useState('');

    useEffect(() => {
        if (!query.trim()) { setHits([]); return; }
        const t = setTimeout(async () => {
            try {
                setSearching(true);
                const url = new URL(`${API_BASE}/api/vocab`);
                url.searchParams.set('search', query.trim());
                if (hskLevel) url.searchParams.set('hsk', String(hskLevel));
                url.searchParams.set('limit', '20');
                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) setHits(data.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query, hskLevel, token]);

    const attachedIds = new Set(items.map(v => v.id));

    const handleAttach = async (vocabId: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/vocabulary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ vocabularyId: vocabId, orderIndex: items.length }),
            });
            const data = await res.json();
            if (data.success) {
                onChanged();
            } else {
                alert(data.message || 'Lỗi attach');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        }
    };

    const handleDetach = async (vocabId: number) => {
        if (!confirm('Bỏ từ này khỏi bài?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/vocabulary/${vocabId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                onChanged();
            } else {
                alert(data.message || 'Lỗi xoá');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        }
    };

    const startEditNote = (vocabId: number, current: string | null) => {
        setEditNoteId(vocabId);
        setEditNoteValue(current || '');
    };

    const cancelEditNote = () => {
        setEditNoteId(null);
        setEditNoteValue('');
    };

    const saveNote = async (vocabId: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/vocabulary/${vocabId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ noteVi: editNoteValue.trim() || null }),
            });
            const data = await res.json();
            if (data.success) {
                cancelEditNote();
                onChanged();
            } else {
                alert(data.message || 'Lỗi lưu note');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">Từ vựng đã attach ({items.length})</h3>
                {items.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] py-8 text-center bg-[var(--surface)] rounded-xl border border-dashed border-[var(--border)]">
                        Chưa có từ nào — search và Add ở bên phải.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {items.map(v => (
                            <li key={v.link_id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-start gap-3">
                                <span className="text-xs text-[var(--text-muted)] mt-1 font-mono w-6 shrink-0">#{v.order_index}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-lg font-medium text-[var(--text-main)] hanzi">{v.simplified}</span>
                                        <span className="text-xs text-[var(--text-secondary)]">{v.pinyin}</span>
                                        {v.word_type && (
                                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                                {v.word_type}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--text-main)]">{v.meaning_vi}</p>
                                    {editNoteId === v.id ? (
                                        <div className="mt-1 flex items-center gap-1">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Note (tuỳ chọn)..."
                                                className="flex-1 px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] text-xs outline-none focus:border-[var(--primary)]"
                                                value={editNoteValue}
                                                onChange={e => setEditNoteValue(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') saveNote(v.id);
                                                    if (e.key === 'Escape') cancelEditNote();
                                                }}
                                            />
                                            <button
                                                onClick={() => saveNote(v.id)}
                                                className="px-2 py-1 text-xs rounded bg-[var(--primary)] text-white hover:opacity-90"
                                            >
                                                Lưu
                                            </button>
                                            <button
                                                onClick={cancelEditNote}
                                                className="px-2 py-1 text-xs rounded text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]"
                                            >
                                                Huỷ
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEditNote(v.id, v.note_vi)}
                                            className="text-xs text-[var(--text-muted)] mt-0.5 italic hover:text-[var(--primary)] transition-colors text-left"
                                            title="Sửa note"
                                        >
                                            {v.note_vi ? `📝 ${v.note_vi}` : '+ Thêm note'}
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDetach(v.id)}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                    title="Bỏ khỏi bài"
                                >
                                    <Icon name="close" size="sm" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">Tìm và thêm từ</h3>
                <input
                    type="text"
                    placeholder="Gõ chữ Hán hoặc pinyin..."
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    {hskLevel ? `Lọc HSK ${hskLevel}.` : 'Tất cả HSK level.'}
                    {searching && ' Đang tìm...'}
                </p>
                <ul className="mt-3 space-y-2 max-h-[600px] overflow-y-auto">
                    {hits.map(h => {
                        const attached = attachedIds.has(h.id);
                        return (
                            <li key={h.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-lg font-medium hanzi">{h.simplified}</span>
                                        <span className="text-xs text-[var(--text-secondary)]">{h.pinyin}</span>
                                        {h.hsk_level && (
                                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-500">HSK {h.hsk_level}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] line-clamp-1">{h.meaning_vi}</p>
                                </div>
                                {attached ? (
                                    <span className="text-xs text-emerald-500 px-2 py-1">✓ Đã có</span>
                                ) : (
                                    <button
                                        onClick={() => handleAttach(h.id)}
                                        className="px-3 py-1 text-xs rounded-lg bg-[var(--primary)] text-white hover:opacity-90"
                                    >
                                        Thêm
                                    </button>
                                )}
                            </li>
                        );
                    })}
                    {!searching && query && hits.length === 0 && (
                        <li className="text-xs text-[var(--text-muted)] text-center py-4">Không tìm thấy.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}

// ============================== GRAMMAR TAB ==============================

interface GrammarSearchHit {
    id: number;
    grammar_point: string;
    pattern_formula: string | null;
    explanation: string;
    hsk_level: number | null;
}

function GrammarTab({
    lessonId, items, hskLevel, token, onChanged,
}: { lessonId: string; items: GrammarRow[]; hskLevel: number | null; token: string | null; onChanged: () => void }) {
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<GrammarSearchHit[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const t = setTimeout(async () => {
            try {
                setSearching(true);
                const url = new URL(`${API_BASE}/api/grammar`);
                if (query.trim()) url.searchParams.set('search', query.trim());
                if (hskLevel) url.searchParams.set('hsk', String(hskLevel));
                url.searchParams.set('limit', '20');
                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) setHits(data.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query, hskLevel, token]);

    const attachedIds = new Set(items.map(g => g.id));

    const handleAttach = async (grammarId: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/grammar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ grammarPatternId: grammarId, orderIndex: items.length }),
            });
            const data = await res.json();
            if (data.success) {
                onChanged();
            } else {
                alert(data.message || 'Lỗi attach');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        }
    };

    const handleDetach = async (grammarId: number) => {
        if (!confirm('Bỏ pattern này khỏi bài?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/grammar/${grammarId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                onChanged();
            } else {
                alert(data.message || 'Lỗi xoá');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">Ngữ pháp đã attach ({items.length})</h3>
                {items.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] py-8 text-center bg-[var(--surface)] rounded-xl border border-dashed border-[var(--border)]">
                        Chưa có ngữ pháp nào.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {items.map(g => (
                            <li key={g.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                                        <span className="text-xs text-[var(--text-muted)] font-mono">#{g.order_index}</span>
                                        <strong className="text-[var(--text-main)]">{g.grammar_point}</strong>
                                        {g.pattern_formula && (
                                            <code className="px-1.5 py-0.5 text-xs rounded bg-[var(--surface-secondary)] text-[var(--primary)] font-mono">
                                                {g.pattern_formula}
                                            </code>
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{g.explanation}</p>
                                </div>
                                <button
                                    onClick={() => handleDetach(g.id)}
                                    className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                    title="Bỏ pattern khỏi bài"
                                >
                                    <Icon name="close" size="xs" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">Tìm và thêm pattern</h3>
                <input
                    type="text"
                    placeholder="Tìm theo grammar_point hoặc formula..."
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    {hskLevel ? `Lọc HSK ${hskLevel}.` : 'Tất cả HSK level.'}
                    {searching && ' Đang tìm...'}
                </p>
                <ul className="mt-3 space-y-2 max-h-[600px] overflow-y-auto">
                    {hits.map(h => {
                        const attached = attachedIds.has(h.id);
                        return (
                            <li key={h.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                                    <strong className="text-sm text-[var(--text-main)]">{h.grammar_point}</strong>
                                    {h.pattern_formula && (
                                        <code className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--surface-secondary)] text-[var(--primary)] font-mono">
                                            {h.pattern_formula}
                                        </code>
                                    )}
                                    {h.hsk_level && (
                                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-500">HSK {h.hsk_level}</span>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{h.explanation}</p>
                                <div className="mt-2 flex justify-end">
                                    {attached ? (
                                        <span className="text-xs text-emerald-500">✓ Đã có</span>
                                    ) : (
                                        <button
                                            onClick={() => handleAttach(h.id)}
                                            className="px-3 py-1 text-xs rounded-lg bg-[var(--primary)] text-white hover:opacity-90"
                                        >
                                            Thêm vào bài
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

// ============================== WRITING TAB ==============================

function WritingTab({
    lessonId, items, token, onChanged,
}: { lessonId: string; items: WritingRow[]; token: string | null; onChanged: () => void }) {
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const emptyForm = {
        prompt_vi: '', prompt_zh: '',
        expected_keywords: '',
        sample_answer_zh: '', sample_answer_pinyin: '', sample_answer_vi: '',
        min_chars: 5, max_chars: 80,
    };
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const closeForm = () => {
        setShowForm(false);
        setEditId(null);
        setForm(emptyForm);
    };

    const startEdit = (row: WritingRow) => {
        setEditId(row.id);
        setForm({
            prompt_vi: row.prompt_vi,
            prompt_zh: row.prompt_zh || '',
            expected_keywords: (row.expected_keywords || []).join(', '),
            sample_answer_zh: row.sample_answer_zh || '',
            sample_answer_pinyin: row.sample_answer_pinyin || '',
            sample_answer_vi: row.sample_answer_vi || '',
            min_chars: row.min_chars,
            max_chars: row.max_chars,
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (saving || !form.prompt_vi.trim()) return;
        try {
            setSaving(true);
            const keywords = form.expected_keywords
                .split(',').map(k => k.trim()).filter(Boolean);
            const body = {
                promptVi: form.prompt_vi.trim(),
                promptZh: form.prompt_zh.trim() || null,
                expectedKeywords: keywords,
                sampleAnswerZh: form.sample_answer_zh.trim() || null,
                sampleAnswerPinyin: form.sample_answer_pinyin.trim() || null,
                sampleAnswerVi: form.sample_answer_vi.trim() || null,
                minChars: form.min_chars,
                maxChars: form.max_chars,
                ...(editId === null ? { orderIndex: items.length } : {}),
            };
            const url = editId === null
                ? `${API_BASE}/api/lessons/${lessonId}/writing`
                : `${API_BASE}/api/lessons/${lessonId}/writing/${editId}`;
            const res = await fetch(url, {
                method: editId === null ? 'POST' : 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                closeForm();
                onChanged();
            } else {
                alert(data.message || 'Lỗi lưu writing');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Xoá bài tập viết này?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/writing/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                if (editId === id) closeForm();
                onChanged();
            } else {
                alert(data.message || 'Lỗi xoá');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi mạng');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-main)]">
                    Bài tập viết ({items.length})
                    {editId !== null && <span className="ml-2 text-xs text-amber-500">— đang sửa #{editId}</span>}
                </h3>
                <Button onClick={() => showForm ? closeForm() : setShowForm(true)} className="flex items-center gap-2">
                    <Icon name={showForm ? 'close' : 'add'} size="sm" />
                    {showForm ? 'Đóng form' : 'Thêm bài tập'}
                </Button>
            </div>

            {showForm && (
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Đề bài tiếng Việt *</label>
                        <textarea
                            rows={2} required
                            placeholder='Vd: Viết 1 câu giới thiệu gia đình bạn theo mẫu "我家有 ... 口人"'
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)]"
                            value={form.prompt_vi}
                            onChange={e => setForm({ ...form, prompt_vi: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Đề bài tiếng Trung (optional)</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm hanzi outline-none focus:border-[var(--primary)]"
                            value={form.prompt_zh}
                            onChange={e => setForm({ ...form, prompt_zh: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Keyword bắt buộc (cách nhau bằng dấu phẩy)</label>
                        <input
                            type="text"
                            placeholder="Vd: 我家, 有, 口人"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm hanzi outline-none focus:border-[var(--primary)]"
                            value={form.expected_keywords}
                            onChange={e => setForm({ ...form, expected_keywords: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Đáp án mẫu (zh)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm hanzi outline-none"
                                value={form.sample_answer_zh}
                                onChange={e => setForm({ ...form, sample_answer_zh: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Pinyin</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm italic outline-none"
                                value={form.sample_answer_pinyin}
                                onChange={e => setForm({ ...form, sample_answer_pinyin: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Bản dịch</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm outline-none"
                                value={form.sample_answer_vi}
                                onChange={e => setForm({ ...form, sample_answer_vi: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Min chars</label>
                            <input
                                type="number" min={1}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm outline-none"
                                value={form.min_chars}
                                onChange={e => setForm({ ...form, min_chars: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Max chars</label>
                            <input
                                type="number" min={5}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm outline-none"
                                value={form.max_chars}
                                onChange={e => setForm({ ...form, max_chars: parseInt(e.target.value) || 80 })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={closeForm} disabled={saving}>Huỷ</Button>
                        <Button onClick={handleSubmit} disabled={saving || !form.prompt_vi.trim()}>
                            {saving ? 'Đang lưu...' : (editId === null ? 'Tạo bài tập' : 'Lưu thay đổi')}
                        </Button>
                    </div>
                </div>
            )}

            {items.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-8 text-center bg-[var(--surface)] rounded-xl border border-dashed border-[var(--border)]">
                    Chưa có bài tập viết — nhấn "Thêm bài tập" ở trên.
                </p>
            ) : (
                <ul className="space-y-3">
                    {items.map(ex => (
                        <li
                            key={ex.id}
                            className={`p-4 rounded-xl bg-[var(--surface)] border transition-colors ${
                                editId === ex.id ? 'border-amber-500' : 'border-[var(--border)]'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap mb-2">
                                        <span className="text-xs text-[var(--text-muted)] font-mono">#{ex.order_index}</span>
                                        <strong className="text-[var(--text-main)]">{ex.prompt_vi}</strong>
                                    </div>
                                    {ex.prompt_zh && <p className="text-sm hanzi text-[var(--text-secondary)] mb-2">{ex.prompt_zh}</p>}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {ex.expected_keywords && ex.expected_keywords.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                                                Keywords: {ex.expected_keywords.join(', ')}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                            {ex.min_chars}–{ex.max_chars} ký tự
                                        </span>
                                        {ex.sample_answer_zh && (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                                                Có đáp án mẫu
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 flex gap-1">
                                    <button
                                        onClick={() => startEdit(ex)}
                                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                                        title="Sửa bài tập"
                                    >
                                        <Icon name="edit" size="xs" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(ex.id)}
                                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Xoá bài tập"
                                    >
                                        <Icon name="delete" size="xs" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
