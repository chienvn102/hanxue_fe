'use client';

import type { HskQuestion } from '@/lib/api';

interface RP {
    question: HskQuestion;
    value: string;
    onChange: (v: string) => void;
}

/* ─────────────────────────────────────────────────────────────────────
 * SentenceAssembly — HSK 3 Writing Part 1 (Q71-75)
 * Render chunks `[a][b][c]` → user gõ câu hoàn chỉnh.
 * Chấm điểm LOOSE (BE strip whitespace + dấu câu).
 * ───────────────────────────────────────────────────────────────────── */
export function SentenceAssembly({ question, value, onChange }: RP) {
    const meta = (question.meta || {}) as { chunks?: { text: string }[] };
    const chunks = meta.chunks || [];
    return (
        <div>
            {chunks.length > 0 && (
                <div className="my-3 flex flex-wrap gap-2">
                    {chunks.map((c, i) => (
                        <span
                            key={i}
                            className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-main)] border border-[var(--border)] text-base font-medium"
                        >
                            [{c.text}]
                        </span>
                    ))}
                </div>
            )}
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Sắp xếp thành câu hoàn chỉnh..."
                rows={2}
                className="w-full px-4 py-3 mt-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none text-lg"
            />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * FillHanzi — HSK 3 Writing Part 2 (Q76-80)
 * Câu Hán có một chỗ trống ( ) + pinyin gợi ý → user gõ 1 ký tự Hán.
 * meta = { context_zh_with_blank, pinyin_hint }
 * ───────────────────────────────────────────────────────────────────── */
export function FillHanzi({ question, value, onChange }: RP) {
    const meta = (question.meta || {}) as {
        context_zh_with_blank?: string;
        pinyin_hint?: string;
    };
    const context = meta.context_zh_with_blank || question.questionText || '';

    return (
        <div>
            <div className="my-3 leading-relaxed text-lg">
                {context.split(/(\([^)]*\))/g).map((part, i) => {
                    if (part.match(/^\([^)]*\)$/)) {
                        return (
                            <span key={i} className="inline-flex flex-col items-center mx-1 align-middle">
                                {meta.pinyin_hint && (
                                    <span className="text-xs text-[var(--text-muted)] italic mb-1">
                                        {meta.pinyin_hint}
                                    </span>
                                )}
                                <input
                                    type="text"
                                    value={value}
                                    onChange={e => onChange(e.target.value.slice(-2))}
                                    maxLength={2}
                                    className="w-14 h-10 text-center text-xl font-medium rounded-lg border-2 border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)] focus:outline-none"
                                    autoComplete="off"
                                />
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        </div>
    );
}
