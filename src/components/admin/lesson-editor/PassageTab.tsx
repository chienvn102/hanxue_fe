'use client';

import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { UploadField } from '@/components/admin/UploadField';

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
}

export function PassageTab({ value, onChange, onSave, saving }: Props) {
    const set = (k: keyof PassageFields, v: string) => onChange({ ...value, [k]: v });

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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Bài khoá — chữ Hán <span className="text-xs text-[var(--text-muted)]">(passage_zh)</span>
                </label>
                <textarea
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] hanzi text-base focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none h-40 resize-y"
                    placeholder="老师：你好，张明！..."
                    value={value.passage_zh}
                    onChange={e => set('passage_zh', e.target.value)}
                />
            </div>

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
                    Audio bài khoá <span className="text-xs text-[var(--text-muted)]">(MP3 từ edge-tts)</span>
                </label>
                <UploadField
                    label=""
                    type="audio"
                    accept="audio/mpeg,audio/mp3,.mp3"
                    value={value.passage_audio_url}
                    onChange={(v) => set('passage_audio_url', v)}
                />
                {value.passage_audio_url && (
                    <audio src={value.passage_audio_url} controls className="mt-2 w-full" />
                )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-[var(--border)] mt-2 sticky bottom-0 bg-[var(--background)] py-3">
                <Button onClick={onSave} disabled={saving}>
                    <Icon name="save" size="sm" className="mr-1" />
                    {saving ? 'Đang lưu...' : 'Lưu bài khoá'}
                </Button>
            </div>
        </div>
    );
}
