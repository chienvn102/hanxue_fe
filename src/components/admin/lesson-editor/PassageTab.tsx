'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { UploadField } from '@/components/admin/UploadField';
import { getMediaUrl } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface PassageFields {
    passage_zh: string;
    passage_pinyin: string;
    passage_vi: string;
    passage_audio_url: string;
    objectives_vi: string;
}

interface Props {
    value: PassageFields;
    onChange: (v: PassageFields) => void;
    onSave: () => Promise<void>;
    saving: boolean;
    token: string | null;
}

export function PassageTab({ value, onChange, onSave, saving, token }: Props) {
    const set = (k: keyof PassageFields, v: string) => onChange({ ...value, [k]: v });

    const [genningAudio, setGenningAudio] = useState(false);
    const [assisting, setAssisting] = useState(false);
    const [err, setErr] = useState('');

    // Edge TTS: sinh audio từ passage_zh (giống nút Edge ở từ vựng) → poll job.
    const genEdgeAudio = async () => {
        const text = value.passage_zh.trim();
        if (!text) { setErr('Nhập chữ Hán trước khi tạo audio.'); return; }
        setErr('');
        setGenningAudio(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/gen-audio-text-edge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text }),
            });
            const queued = await res.json();
            if (!res.ok || !queued.jobId) throw new Error(queued.message || 'Tạo audio thất bại');

            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 1500));
                const sRes = await fetch(`${API_BASE}/api/admin/jobs/${queued.jobId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const s = await sRes.json();
                if (s.status === 'done' && s.url) {
                    set('passage_audio_url', s.url);
                    return;
                }
                if (s.status === 'failed') throw new Error(s.error || 'Tạo audio thất bại');
            }
            throw new Error('Tạo audio quá lâu, thử lại.');
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Tạo audio thất bại');
        } finally {
            setGenningAudio(false);
        }
    };

    // AI: sinh pinyin (có dấu thanh) + bản dịch tiếng Việt từ passage_zh (Groq).
    const aiAssist = async () => {
        const text = value.passage_zh.trim();
        if (!text) { setErr('Nhập chữ Hán trước khi tạo pinyin/bản dịch.'); return; }
        if ((value.passage_pinyin.trim() || value.passage_vi.trim()) &&
            !confirm('Ghi đè pinyin và bản dịch hiện có bằng kết quả AI?')) return;
        setErr('');
        setAssisting(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/lessons/passage-assist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ passage_zh: text }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Tạo pinyin/bản dịch thất bại');
            onChange({
                ...value,
                passage_pinyin: data.pinyin || value.passage_pinyin,
                passage_vi: data.vi || value.passage_vi,
            });
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Tạo pinyin/bản dịch thất bại');
        } finally {
            setAssisting(false);
        }
    };

    const busy = genningAudio || assisting;

    return (
        <div className="space-y-5 max-w-4xl">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Mục tiêu bài học (tiếng Việt)
                </label>
                <textarea
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-20 resize-none"
                    placeholder="VD: Sau bài này học viên có thể: ..."
                    value={value.objectives_vi}
                    onChange={e => set('objectives_vi', e.target.value)}
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                        Bài khoá — chữ Hán <span className="text-xs text-[var(--text-muted)]">(passage_zh)</span>
                    </label>
                    {/* AI: tạo pinyin + bản dịch từ chữ Hán đã nhập */}
                    <button
                        type="button"
                        onClick={aiAssist}
                        disabled={busy || !value.passage_zh.trim()}
                        title="Dùng AI sinh pinyin (có dấu thanh) + bản dịch tiếng Việt từ chữ Hán ở trên"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Icon name="auto_awesome" size="sm" />
                        {assisting ? 'Đang tạo…' : 'Tạo pinyin + dịch (AI)'}
                    </button>
                </div>
                <textarea
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] hanzi text-base focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-40 resize-y"
                    placeholder="老师：你好，张明！..."
                    value={value.passage_zh}
                    onChange={e => set('passage_zh', e.target.value)}
                />
            </div>

            {err && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                    {err}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Pinyin <span className="text-xs text-[var(--text-muted)]">(tách space giữa các âm tiết)</span>
                </label>
                <textarea
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-40 resize-y"
                    placeholder="lǎo shī: nǐ hǎo, zhāng míng! ..."
                    value={value.passage_pinyin}
                    onChange={e => set('passage_pinyin', e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Bản dịch tiếng Việt
                </label>
                <textarea
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-40 resize-y"
                    placeholder="Cô giáo: Chào em, Trương Minh! ..."
                    value={value.passage_vi}
                    onChange={e => set('passage_vi', e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Audio bài khoá <span className="text-xs text-[var(--text-muted)]">(tải lên MP3 hoặc tạo bằng Edge TTS)</span>
                </label>
                <div className="flex items-start gap-2">
                    <div className="flex-1">
                        <UploadField
                            label=""
                            type="audio"
                            accept="audio/mpeg,audio/mp3,.mp3"
                            value={value.passage_audio_url}
                            onChange={(v) => set('passage_audio_url', v)}
                        />
                    </div>
                    {/* Edge TTS: tạo audio miễn phí từ passage_zh — song song với nút tải lên */}
                    <button
                        type="button"
                        onClick={genEdgeAudio}
                        disabled={busy || !value.passage_zh.trim()}
                        title={!value.passage_zh.trim() ? 'Nhập chữ Hán trước' : 'Tạo audio bằng Microsoft Edge TTS (miễn phí) từ chữ Hán ở trên'}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] hover:bg-[var(--surface-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Icon name="graphic_eq" size="sm" />
                        {genningAudio ? 'Đang tạo…' : 'Edge TTS'}
                    </button>
                </div>
                {value.passage_audio_url && (
                    <audio src={getMediaUrl(value.passage_audio_url)} controls className="mt-2 w-full" />
                )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-[var(--border)] mt-2 sticky bottom-0 bg-[var(--background)] py-3">
                <Button onClick={onSave} disabled={saving || busy}>
                    <Icon name="save" size="sm" className="mr-1" />
                    {saving ? 'Đang lưu...' : 'Lưu bài khoá'}
                </Button>
            </div>
        </div>
    );
}
