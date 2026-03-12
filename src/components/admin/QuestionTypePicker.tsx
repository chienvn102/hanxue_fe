'use client';

import { QUESTION_TYPES_BY_SECTION } from './hsk-types';

interface QuestionTypePickerProps {
    sectionType: string;
    selectedType: string;
    onSelect: (type: string) => void;
}

export function QuestionTypePicker({ sectionType, selectedType, onSelect }: QuestionTypePickerProps) {
    const types = QUESTION_TYPES_BY_SECTION[sectionType]
        ?? Object.values(QUESTION_TYPES_BY_SECTION).flat();

    // Deduplicate for the fallback case
    const seen = new Set<string>();
    const uniqueTypes = types.filter(t => {
        if (seen.has(t.value)) return false;
        seen.add(t.value);
        return true;
    });

    return (
        <div>
            <label className="text-xs text-[var(--text-muted)] block mb-2">Loại câu hỏi</label>
            <div className="grid grid-cols-2 gap-2">
                {uniqueTypes.map(t => (
                    <button
                        key={t.value}
                        type="button"
                        onClick={() => onSelect(t.value)}
                        className={`text-left p-3 rounded-lg border-2 transition-all ${
                            selectedType === t.value
                                ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm'
                                : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{t.icon}</span>
                            <span className="text-sm font-medium text-[var(--text-main)]">{t.label}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1 ml-7">{t.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
