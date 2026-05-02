'use client';

import type { HskQuestion, HskQuestionGroup } from '@/lib/api';
import { PinyinRuby } from '../PinyinRuby';
import { AudioPlayer } from '../AudioPlayer';
import { useHskTest } from '../HskTestContext';

interface RP {
    question: HskQuestion;
    group?: HskQuestionGroup;
    value: string;
    onChange: (v: string) => void;
}

/**
 * Letter input shared cho 3 type group-based.
 * User gõ 1 ký tự (A-F), uppercase + accept lone letter only.
 */
function LetterInput({ value, onChange, allowedLabels }: { value: string; onChange: (v: string) => void; allowedLabels: string[] }) {
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.toUpperCase().slice(-1);
        if (v === '' || allowedLabels.includes(v)) {
            onChange(v);
        }
    };
    return (
        <input
            type="text"
            value={value}
            onChange={handleInput}
            maxLength={1}
            placeholder="?"
            className="w-20 h-12 text-center text-xl font-bold rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] focus:border-[var(--primary)] outline-none uppercase"
            autoComplete="off"
        />
    );
}

function getLabels(group: HskQuestionGroup | undefined): string[] {
    const items = (group?.content as { items?: { label: string }[] } | null)?.items;
    return items ? items.map(i => i.label) : ['A', 'B', 'C', 'D', 'E', 'F'];
}

/* ─────────────────────────────────────────────────────────────────────
 * ImageGridMatch — HSK 1/2 Listening + Reading
 * User nghe audio HOẶC đọc text → chọn ảnh từ grid (label A-F).
 * Group resource (image grid) đã render ở GroupHeader phía trên.
 * ───────────────────────────────────────────────────────────────────── */
export function ImageGridMatch({ question, group, value, onChange }: RP) {
    const { showPinyin, testMode } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    return (
        <div>
            {question.questionAudio && testMode === 'practice' && <AudioPlayer src={question.questionAudio} />}
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <LetterInput value={value} onChange={onChange} allowedLabels={getLabels(group)} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * WordBankFill — HSK 1/2/3 Reading fill blank from word bank
 * Câu/dialogue có ( ) → user gõ letter A-F.
 * ───────────────────────────────────────────────────────────────────── */
export function WordBankFill({ question, group, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    return (
        <div>
            {question.questionText && (
                <div className="my-3 leading-relaxed">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <LetterInput value={value} onChange={onChange} allowedLabels={getLabels(group)} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * ReplyMatch — HSK 2/3 Reading match prompt with reply bank
 * Prompt câu/dialogue → user chọn reply từ bank (label A-F).
 * ───────────────────────────────────────────────────────────────────── */
export function ReplyMatch({ question, group, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    return (
        <div>
            {question.questionText && (
                <div className="my-3 leading-relaxed">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <LetterInput value={value} onChange={onChange} allowedLabels={getLabels(group)} />
        </div>
    );
}
