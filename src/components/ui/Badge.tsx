type HSKLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface BadgeProps {
    level: HSKLevel;
    className?: string;
}

const levelColors: Record<HSKLevel, { bg: string; text: string }> = {
    1: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    2: { bg: 'bg-sky-500/10', text: 'text-sky-500' },
    3: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    4: { bg: 'bg-red-500/10', text: 'text-red-500' },
    5: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    6: { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
};

const levelLabels: Record<HSKLevel, string> = {
    1: 'HSK 1',
    2: 'HSK 2',
    3: 'HSK 3',
    4: 'HSK 4',
    5: 'HSK 5',
    6: 'HSK 6',
};

export function HSKBadge({ level, className = '' }: BadgeProps) {
    const colors = levelColors[level];

    return (
        <span className={`
            inline-flex items-center px-2.5 py-1 rounded-md
            text-[10px] font-bold uppercase tracking-wide
            ${colors.bg} ${colors.text}
            ${className}
        `}>
            {levelLabels[level]}
        </span>
    );
}
