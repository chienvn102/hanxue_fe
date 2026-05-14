'use client';

import type { StrokeWriterMode } from './StrokeWriter';
import { Icon } from './ui/Icon';

interface Props {
    open: boolean;
    value: StrokeWriterMode;
    onChange: (mode: StrokeWriterMode) => void;
    onClose: () => void;
}

export default function WriteModeModal({ open, value, onChange, onClose }: Props) {
    if (!open) return null;

    const options: Array<{
        mode: StrokeWriterMode;
        title: string;
        desc: string;
        icon: string;
        color: string;
    }> = [
        {
            mode: 'trace',
            title: 'Do net',
            desc: 'Xem goi y va do theo thu tu net.',
            icon: 'gesture',
            color: 'border-cyan-400 bg-cyan-500/10 text-cyan-500',
        },
        {
            mode: 'memorize',
            title: 'Viet nho',
            desc: 'An outline, viet tu tri nho va chi goi y khi can.',
            icon: 'psychology',
            color: 'border-purple-400 bg-purple-500/10 text-purple-500',
        },
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)]">Chon che do viet chu</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]">
                        <Icon name="close" size="sm" />
                    </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {options.map(option => (
                        <button
                            key={option.mode}
                            type="button"
                            onClick={() => {
                                onChange(option.mode);
                                onClose();
                            }}
                            className={`text-left rounded-xl border p-4 transition ${option.color} ${
                                value === option.mode ? 'ring-2 ring-[var(--primary)]' : ''
                            }`}
                        >
                            <Icon name={option.icon} className="mb-3" />
                            <div className="font-bold">{option.title}</div>
                            <p className="text-sm mt-1 text-[var(--text-secondary)]">{option.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
