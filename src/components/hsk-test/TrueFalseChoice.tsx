'use client';

import { Icon } from '@/components/ui/Icon';

interface Props {
    value: string;
    onChange: (v: string) => void;
    /**
     * "AB" → A.TRUE / B.FALSE (HSK 1 listening, reading)
     * "DS" → Đúng / Sai (legacy)
     */
    style?: 'AB' | 'DS';
}

export function TrueFalseChoice({ value, onChange, style = 'AB' }: Props) {
    const opts =
        style === 'AB'
            ? [{ key: 'A', label: 'A. TRUE' }, { key: 'B', label: 'B. FALSE' }]
            : [{ key: 'Đúng', label: 'Đúng' }, { key: 'Sai', label: 'Sai' }];

    return (
        <div className="flex gap-3 mt-3">
            {opts.map(opt => {
                const selected = value === opt.key;
                return (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => onChange(opt.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                            selected
                                ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-semibold'
                                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] hover:border-[var(--border-hover)]'
                        }`}
                    >
                        <Icon name={selected ? 'radio_button_checked' : 'radio_button_unchecked'} size="sm" />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
