'use client';

import type { HskOption, HskQuestion } from '@/lib/api';
import { getMediaUrl } from '@/lib/api';

interface RP {
    question: HskQuestion;
    value: string;
    onChange: (v: string) => void;
}

function optionToText(option: string | HskOption): string {
    return typeof option === 'string' ? option : option.text;
}

function parseSentenceChunks(question: HskQuestion): { text: string }[] {
    const meta = (question.meta || {}) as { chunks?: { text: string }[] };
    if (meta.chunks && meta.chunks.length > 0) return meta.chunks;

    const raw = (question.questionText || '')
        .replace(/^\s*\d+[\.．、]\s*/, '')
        .trim();
    if (!raw) return [];

    const parts = /[\/／]/.test(raw)
        ? raw.split(/\s*[\/／]\s*/)
        : raw.split(/\s+/);

    return parts
        .map(s => s.trim())
        .filter(Boolean)
        .map(text => ({ text }));
}

function getKeyword(question: HskQuestion): string {
    const meta = (question.meta || {}) as { keyword?: string };
    if (meta.keyword) return meta.keyword;
    if (question.statement) return question.statement;
    const match = (question.questionText || '').match(/[“"「『]?([\u3400-\u9FFF]{1,8})[”"」』]?/);
    return match?.[1] || '';
}

/* ─────────────────────────────────────────────────────────────────────
 * SentenceAssembly — HSK 3 Writing Part 1 (Q71-75)
 * Render chunks `[a][b][c]` → user gõ câu hoàn chỉnh.
 * Chấm điểm LOOSE (BE strip whitespace + dấu câu).
 * ───────────────────────────────────────────────────────────────────── */
export function SentenceAssembly({ question, value, onChange }: RP) {
    /* Chunks lấy từ:
     *   - meta.chunks: [{text:'电梯'}, ...] (schema mới, dành cho UI drag-drop tương lai)
     *   - hoặc parse questionText nếu có dấu '/' (vd seed H41328: "电梯 / 正常 / 使用了 / 已经可以")
     *   - hoặc whitespace-separated (fallback)
     */
    const chunks = parseSentenceChunks(question);

    // Click chunk → append vào textarea với khoảng trắng phân cách (tiện cho mobile)
    const appendChunk = (text: string) => {
        const sep = value && !value.endsWith(' ') ? ' ' : '';
        onChange(value + sep + text);
    };

    return (
        <div>
            {chunks.length > 0 && (
                <div className="my-3 flex flex-wrap gap-2">
                    {chunks.map((c, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => appendChunk(c.text)}
                            className="px-3 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-main)] border border-[var(--border)] text-base font-medium hsk-zh hover:bg-[var(--primary)]/10 hover:border-[var(--primary)] transition-colors"
                            title="Bấm để thêm vào câu trả lời"
                        >
                            {c.text}
                        </button>
                    ))}
                </div>
            )}
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Sắp xếp thành câu hoàn chỉnh (gõ trực tiếp hoặc bấm các từ phía trên)..."
                rows={2}
                className="w-full px-4 py-3 mt-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none text-lg"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="mt-2 text-xs text-[var(--text-muted)] hover:text-red-500"
                >
                    Xoá hết
                </button>
            )}
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

export function ImageKeywordSentence({ question, value, onChange }: RP) {
    const keyword = getKeyword(question);
    return (
        <div className="space-y-4">
            {question.questionImage && (
                <img
                    src={getMediaUrl(question.questionImage)}
                    alt=""
                    className="max-h-72 w-full object-contain rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                />
            )}
            {(keyword || question.questionText) && (
                <div className="text-sm text-[var(--text-secondary)]">
                    {question.questionText}
                    {keyword && <span className="ml-2 font-semibold text-[var(--primary)]">{keyword}</span>}
                </div>
            )}
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={3}
                placeholder="Viết một câu hoàn chỉnh..."
                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none"
            />
        </div>
    );
}

export function ShortEssay({ question, value, onChange }: RP) {
    const meta = (question.meta || {}) as { keywords?: string[] };
    return (
        <div className="space-y-4">
            {question.questionImage && (
                <img
                    src={getMediaUrl(question.questionImage)}
                    alt=""
                    className="max-h-72 w-full object-contain rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                />
            )}
            {meta.keywords?.length ? (
                <div className="flex flex-wrap gap-2">
                    {meta.keywords.map((keyword, index) => (
                        <span key={index} className="px-2.5 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium">
                            {keyword}
                        </span>
                    ))}
                </div>
            ) : null}
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={7}
                placeholder="Viết đoạn văn theo yêu cầu..."
                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none"
            />
        </div>
    );
}

export function SummaryEssay({ question, value, onChange }: RP) {
    const meta = (question.meta || {}) as { source_passage?: string; min_chars?: number; max_chars?: number };
    return (
        <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] whitespace-pre-wrap leading-relaxed">
                {meta.source_passage || question.passage || question.questionText}
            </div>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={9}
                placeholder={`Viết tóm tắt${meta.max_chars ? ` tối đa ${meta.max_chars} chữ` : ''}...`}
                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none"
            />
        </div>
    );
}

export function MultiBlankChoice({ question, value, onChange }: RP) {
    return (
        <div className="space-y-4">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{question.passage || question.questionText}</p>
            <div className="grid gap-2">
                {(question.options || []).map((option, index) => {
                    const label = String.fromCharCode(65 + index);
                    const selected = value === label;
                    return (
                        <button
                            key={label}
                            type="button"
                            onClick={() => onChange(label)}
                            className={`text-left p-3 rounded-xl border transition-colors ${
                                selected
                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]'
                            }`}
                        >
                            <span className="font-bold mr-2">{label}.</span>{optionToText(option)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function SentenceIntoPassage({ question, value, onChange }: RP) {
    return (
        <div className="space-y-4">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{question.passage || question.questionText}</p>
            <div className="grid gap-2">
                {(question.options || []).map((option, index) => {
                    const label = String.fromCharCode(65 + index);
                    const selected = value === label;
                    return (
                        <button
                            key={label}
                            type="button"
                            onClick={() => onChange(label)}
                            className={`text-left p-3 rounded-xl border transition-colors ${
                                selected
                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]'
                            }`}
                        >
                            <span className="font-bold mr-2">{label}.</span>{optionToText(option)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
