'use client';

import type { HskOption } from '@/lib/api';
import { PinyinRuby } from './PinyinRuby';
import { useHskTest } from './HskTestContext';

interface Props {
    options: string[] | HskOption[];
    value: string;
    onChange: (v: string) => void;
}

/**
 * MCQ với N options (3 cho HSK 1-3, 4 cho HSK 4+).
 * Options có thể là string[] (legacy plain text) hoặc HskOption[] (có pinyin).
 */
export function McqChoice({ options, value, onChange }: Props) {
    const { showPinyin } = useHskTest();

    // Normalize: nếu options là string[] → map sang HskOption-like (label từ index)
    const normalized: { label: string; text: string; pinyin?: string }[] = options.map((opt, idx) => {
        if (typeof opt === 'string') {
            return { label: String.fromCharCode(65 + idx), text: opt };
        }
        return opt;
    });

    return (
        <div className="space-y-2 mt-3">
            {normalized.map(opt => {
                const selected = value === opt.label;
                return (
                    <button
                        key={opt.label}
                        type="button"
                        onClick={() => onChange(opt.label)}
                        className={`w-full flex items-baseline gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            selected
                                ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]'
                        }`}
                    >
                        <span
                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                                selected
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                            }`}
                        >
                            {opt.label}
                        </span>
                        <div className="flex-1 min-w-0">
                            <PinyinRuby
                                zh={opt.text}
                                pinyin={opt.pinyin}
                                show={showPinyin}
                                fontSize="base"
                            />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
