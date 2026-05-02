'use client';

import type { HskQuestion } from '@/lib/api';
import { McqChoice } from '../McqChoice';
import { TrueFalseChoice } from '../TrueFalseChoice';
import { useHskTest } from '../HskTestContext';
import { PinyinRuby } from '../PinyinRuby';

interface RP {
    question: HskQuestion;
    value: string;
    onChange: (v: string) => void;
}

/**
 * Legacy renderers giữ tương thích với data hiện có trong DB
 * (multiple_choice / true_false / fill_blank / sentence_order /
 *  error_identify / short_answer / image_match).
 *
 * Khi data được migrate sang type mới sẽ ít dùng các renderer này.
 */

export function LegacyMcq({ question, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    return (
        <div>
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <McqChoice options={question.options} value={value} onChange={onChange} />
        </div>
    );
}

export function LegacyTrueFalse({ question, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    // Detect style: "Đúng"/"Sai" hay A.TRUE/B.FALSE dựa vào options array hiện có
    const useDS = (question.options as unknown[]).some(o => {
        const t = typeof o === 'string' ? o : (o as { text?: string }).text || '';
        return t === 'Đúng' || t === 'Sai';
    });
    return (
        <div>
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <TrueFalseChoice value={value} onChange={onChange} style={useDS ? 'DS' : 'AB'} />
        </div>
    );
}

export function LegacyFillBlank({ question, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    return (
        <div>
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Điền vào chỗ trống..."
                className="w-full px-4 py-3 mt-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none text-lg"
                autoComplete="off"
            />
        </div>
    );
}

export function LegacyShortAnswer({ question, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    return (
        <div>
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Nhập câu trả lời..."
                rows={3}
                className="w-full px-4 py-3 mt-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none text-lg"
            />
        </div>
    );
}
