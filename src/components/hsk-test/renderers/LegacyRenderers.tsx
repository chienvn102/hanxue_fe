'use client';

import { getMediaUrl, type HskQuestion } from '@/lib/api';
import { McqChoice } from '../McqChoice';
import { TrueFalseChoice } from '../TrueFalseChoice';
import { useHskTest } from '../HskTestContext';
import { PinyinRuby } from '../PinyinRuby';
import { AudioPlayer } from '../AudioPlayer';

interface RP {
    question: HskQuestion;
    value: string;
    onChange: (v: string) => void;
}

function QuestionAudio({ question }: { question: HskQuestion }) {
    const { testMode, allowQuestionAudio } = useHskTest();
    if (!question.questionAudio || !allowQuestionAudio) return null;

    return (
        <AudioPlayer
            key={question.id}
            src={question.questionAudio}
            maxPlays={testMode === 'full' ? question.audioPlayCount : undefined}
        />
    );
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
            <QuestionAudio question={question} />
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <McqChoice options={question.options} value={value} onChange={onChange} />
        </div>
    );
}

/**
 * ImageMatch — câu chọn 1 trong các ẢNH (A/B/C[/D]) theo audio/đề.
 * HSK1 nghe 6-10: 3 ảnh A/B/C. Ảnh nằm ở optionImages[]; học viên chọn chữ cái.
 */
export function ImageMatch({ question, value, onChange }: RP) {
    const { showPinyin } = useHskTest();
    const meta = (question.meta || {}) as { pinyin?: { question_text?: string } };
    const labels = ['A', 'B', 'C', 'D'];
    const images = question.optionImages || [];
    const items = labels
        .map((label, idx) => ({ label, url: images[idx] || '' }))
        .filter(it => it.url); // chỉ hiện ô có ảnh (thường 3 ảnh A/B/C)
    return (
        <div>
            <QuestionAudio question={question} />
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            <div className={`grid gap-3 mt-3 ${items.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {items.map(it => {
                    const selected = value === it.label;
                    return (
                        <button
                            key={it.label}
                            type="button"
                            onClick={() => onChange(it.label)}
                            className={`relative rounded-xl border-2 overflow-hidden transition-colors ${selected
                                ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/40'
                                : 'border-[var(--border)] hover:border-[var(--text-muted)]'}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getMediaUrl(it.url)} alt={it.label} className="w-full aspect-square object-contain bg-white" />
                            <span className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selected
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-black/50 text-white'}`}>{it.label}</span>
                        </button>
                    );
                })}
            </div>
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
            <QuestionAudio question={question} />
            {question.questionText && (
                <div className="my-3">
                    <PinyinRuby zh={question.questionText} pinyin={meta.pinyin?.question_text} show={showPinyin} fontSize="lg" />
                </div>
            )}
            {/* Defensive: hiển thị statement nếu có và không trùng với questionText.
                Trường hợp routing không match nhánh có statement. */}
            {question.statement && !question.questionText && (
                <div className="my-3 p-3 rounded-lg bg-[var(--surface-secondary)] border-l-4 border-[var(--primary)]">
                    <span className="text-[var(--primary)] mr-2">★</span>
                    <PinyinRuby zh={question.statement} show={showPinyin} fontSize="lg" />
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
            <QuestionAudio question={question} />
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
            <QuestionAudio question={question} />
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
