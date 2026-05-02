'use client';

import type { HskQuestion } from '@/lib/api';
import { getMediaUrl } from '@/lib/api';
import { PinyinRuby } from '../PinyinRuby';
import { TrueFalseChoice } from '../TrueFalseChoice';
import { AudioPlayer } from '../AudioPlayer';
import { useHskTest } from '../HskTestContext';

interface RP {
    question: HskQuestion;
    value: string;
    onChange: (v: string) => void;
}

/* ─────────────────────────────────────────────────────────────────────
 * AudioImageJudge — HSK 1/2 Listening Part 1
 * Audio + image → A. TRUE / B. FALSE
 * ───────────────────────────────────────────────────────────────────── */
export function AudioImageJudge({ question, value, onChange }: RP) {
    const { testMode } = useHskTest();
    return (
        <div>
            {question.questionAudio && testMode === 'practice' && <AudioPlayer src={question.questionAudio} />}
            {question.questionImage && (
                <img
                    src={getMediaUrl(question.questionImage)}
                    alt="Question"
                    className="max-h-48 rounded-lg my-3 object-contain"
                />
            )}
            <TrueFalseChoice value={value} onChange={onChange} style="AB" />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * ImageCharJudge — HSK 1 Reading Part 1
 * Image + Hanzi → A. TRUE / B. FALSE
 * ───────────────────────────────────────────────────────────────────── */
export function ImageCharJudge({ question, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    const pinyin = meta.pinyin?.question_text;
    return (
        <div>
            {question.questionImage && (
                <img
                    src={getMediaUrl(question.questionImage)}
                    alt="Question"
                    className="max-h-48 rounded-lg my-3 object-contain"
                />
            )}
            {question.questionText && (
                <div className="my-3 text-center">
                    <PinyinRuby
                        zh={question.questionText}
                        pinyin={pinyin}
                        show={showPinyin}
                        fontSize="2xl"
                    />
                </div>
            )}
            <TrueFalseChoice value={value} onChange={onChange} style="AB" />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * AudioStatementJudge — HSK 3 Listening Part 2
 * Audio + ★ statement → A. TRUE / B. FALSE
 * ───────────────────────────────────────────────────────────────────── */
export function AudioStatementJudge({ question, value, onChange }: RP) {
    const { showPinyin, testMode } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { statement?: string } };
    const stmtPinyin = meta.pinyin?.statement;
    return (
        <div>
            {question.questionAudio && testMode === 'practice' && <AudioPlayer src={question.questionAudio} />}
            {question.statement && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--surface-secondary)] border-l-4 border-[var(--primary)]">
                    <span className="text-[var(--primary)] mr-2">★</span>
                    <PinyinRuby zh={question.statement} pinyin={stmtPinyin} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <TrueFalseChoice value={value} onChange={onChange} style="AB" />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * ParagraphStatementJudge — HSK 2 Reading Part 3
 * Paragraph + ★ statement → A. TRUE / B. FALSE
 * ───────────────────────────────────────────────────────────────────── */
export function ParagraphStatementJudge({ question, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { passage?: string; statement?: string } };
    return (
        <div>
            {question.passage && (
                <div className="mb-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] leading-relaxed">
                    <PinyinRuby zh={question.passage} pinyin={meta.pinyin?.passage} show={showPinyin} fontSize="base" />
                </div>
            )}
            {question.statement && (
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border-l-4 border-[var(--primary)]">
                    <span className="text-[var(--primary)] mr-2">★</span>
                    <PinyinRuby zh={question.statement} pinyin={meta.pinyin?.statement} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <TrueFalseChoice value={value} onChange={onChange} style="AB" />
        </div>
    );
}
