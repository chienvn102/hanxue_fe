'use client';

import { type HskQuestionGroup, getMediaUrl } from '@/lib/api';
import { PinyinRuby } from './PinyinRuby';
import { useHskTest } from './HskTestContext';

interface Props {
    group: HskQuestionGroup;
}

/**
 * GroupHeader — render shared resource (image grid / word bank / reply bank
 * / passage) ở trên cụm câu cùng group_id.
 */
export function GroupHeader({ group }: Props) {
    const { showPinyin } = useHskTest();
    const content = group.content as Record<string, unknown> | null;
    if (!content) return null;

    if (group.group_type === 'image_grid') {
        const items = (content.items as { label: string; image_url: string; alt_vi?: string }[]) || [];
        const example = content.example as { label: string; content: { zh: string; pinyin?: string } } | undefined;
        return (
            <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {group.instructions_vi && (
                    <p className="text-xs text-[var(--text-muted)] italic mb-3">{group.instructions_vi}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {items.map(item => (
                        <div key={item.label} className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-[var(--text-secondary)] mb-2">{item.label}</span>
                            <img
                                src={getMediaUrl(item.image_url)}
                                alt={item.alt_vi || item.label}
                                className="w-full max-w-[200px] aspect-square object-contain rounded-lg bg-white"
                            />
                        </div>
                    ))}
                </div>
                {example && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)] text-sm text-[var(--text-muted)]">
                        <span className="mr-2">例如：</span>
                        <PinyinRuby zh={example.content.zh} pinyin={example.content.pinyin} show={showPinyin} fontSize="sm" />
                        <span className="ml-2 font-bold">({example.label})</span>
                    </div>
                )}
            </div>
        );
    }

    if (group.group_type === 'word_bank') {
        const items = (content.items as { label: string; word: string; pinyin?: string }[]) || [];
        const example = content.example as { label: string; sentence_zh: string; sentence_pinyin?: string } | undefined;
        return (
            <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {group.instructions_vi && (
                    <p className="text-xs text-[var(--text-muted)] italic mb-3">{group.instructions_vi}</p>
                )}
                <div className="flex flex-col gap-2">
                    {items.map(item => (
                        <div key={item.label} className="flex items-baseline gap-3">
                            <span className="text-sm font-bold text-[var(--text-secondary)] w-6">{item.label}</span>
                            <PinyinRuby zh={item.word} pinyin={item.pinyin} show={showPinyin} fontSize="lg" />
                        </div>
                    ))}
                </div>
                {example && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)] text-sm">
                        <span className="text-[var(--text-muted)] mr-2">例如：</span>
                        <PinyinRuby zh={example.sentence_zh} pinyin={example.sentence_pinyin} show={showPinyin} fontSize="sm" />
                        <span className="ml-2 font-bold">({example.label})</span>
                    </div>
                )}
            </div>
        );
    }

    if (group.group_type === 'reply_bank') {
        const items = (content.items as { label: string; sentence_zh: string; sentence_pinyin?: string }[]) || [];
        const example = content.example as { label: string; prompt_zh: string; prompt_pinyin?: string } | undefined;
        return (
            <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {group.instructions_vi && (
                    <p className="text-xs text-[var(--text-muted)] italic mb-3">{group.instructions_vi}</p>
                )}
                <div className="flex flex-col gap-3">
                    {items.map(item => (
                        <div key={item.label} className="flex items-baseline gap-3">
                            <span className="text-sm font-bold text-[var(--text-secondary)] w-6 shrink-0">{item.label}</span>
                            <div className="flex-1">
                                <PinyinRuby zh={item.sentence_zh} pinyin={item.sentence_pinyin} show={showPinyin} fontSize="base" />
                            </div>
                        </div>
                    ))}
                </div>
                {example && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)] text-sm">
                        <span className="text-[var(--text-muted)] mr-2">例如：</span>
                        <PinyinRuby zh={example.prompt_zh} pinyin={example.prompt_pinyin} show={showPinyin} fontSize="sm" />
                        <span className="ml-2 font-bold">({example.label})</span>
                    </div>
                )}
            </div>
        );
    }

    if (group.group_type === 'passage') {
        const passage_zh = (content.passage_zh as string) || '';
        const passage_pinyin = content.passage_pinyin as string | undefined;
        const passage_vi = content.passage_vi as string | undefined;
        return (
            <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {group.title_vi && (
                    <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">{group.title_vi}</h3>
                )}
                <div className="leading-relaxed">
                    <PinyinRuby zh={passage_zh} pinyin={passage_pinyin} show={showPinyin} fontSize="base" />
                </div>
                {passage_vi && (
                    <p className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)] italic">
                        {passage_vi}
                    </p>
                )}
            </div>
        );
    }

    return null;
}
