'use client';

import type { HskQuestion } from '@/lib/api';
import { PinyinRuby } from '../PinyinRuby';
import { McqChoice } from '../McqChoice';
import { AudioPlayer } from '../AudioPlayer';
import { useHskTest } from '../HskTestContext';

interface RP {
    question: HskQuestion;
    value: string;
    onChange: (v: string) => void;
}

/* ─────────────────────────────────────────────────────────────────────
 * AudioMcqShort — HSK 1/2/3 Listening Part 3-4
 * Audio + 3 options A/B/C (text + pinyin nếu có)
 * ───────────────────────────────────────────────────────────────────── */
export function AudioMcqShort({ question, value, onChange }: RP) {
    const { testMode } = useHskTest();
    return (
        <div>
            {question.questionAudio && testMode === 'practice' && <AudioPlayer src={question.questionAudio} />}
            <McqChoice options={question.options} value={value} onChange={onChange} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────
 * ParagraphMcq — HSK 3 Reading Part 4 (Q61-70)
 * Paragraph + ★ statement + 3 options A/B/C
 * ───────────────────────────────────────────────────────────────────── */
export function ParagraphMcq({ question, value, onChange }: RP) {
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
                <div className="mb-3 p-3 rounded-lg bg-[var(--surface-secondary)] border-l-4 border-[var(--primary)]">
                    <span className="text-[var(--primary)] mr-2">★</span>
                    <PinyinRuby zh={question.statement} pinyin={meta.pinyin?.statement} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <McqChoice options={question.options} value={value} onChange={onChange} />
        </div>
    );
}
