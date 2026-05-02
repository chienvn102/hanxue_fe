'use client';

import type { HskQuestion, HskQuestionGroup } from '@/lib/api';
import {
    AudioImageJudge,
    ImageCharJudge,
    AudioStatementJudge,
    ParagraphStatementJudge,
} from './renderers/TrueFalseRenderers';
import { AudioMcqShort, ParagraphMcq } from './renderers/McqRenderers';
import {
    ImageGridMatch,
    WordBankFill,
    ReplyMatch,
} from './renderers/GroupBasedRenderers';
import { SentenceAssembly, FillHanzi } from './renderers/WritingRenderers';
import {
    LegacyMcq,
    LegacyTrueFalse,
    LegacyFillBlank,
    LegacyShortAnswer,
} from './renderers/LegacyRenderers';

interface Props {
    question: HskQuestion;
    group?: HskQuestionGroup;
    value: string;
    onChange: (v: string) => void;
}

/**
 * Dispatcher chính — chọn renderer theo questionType + heuristic dựa vào
 * fields có trong question (statement, passage, audio, image).
 */
export function QuestionRenderer({ question, group, value, onChange }: Props) {
    const props = { question, value, onChange };

    switch (question.questionType) {
        // ─── MỚI sau migration 006 ──────────────────────────────────────
        case 'image_grid_match':
            return <ImageGridMatch {...props} group={group} />;

        case 'word_bank_fill':
            return <WordBankFill {...props} group={group} />;

        case 'reply_match':
            return <ReplyMatch {...props} group={group} />;

        case 'sentence_assembly':
            return <SentenceAssembly {...props} />;

        case 'fill_hanzi':
            return <FillHanzi {...props} />;

        // ─── true_false: chọn variant dựa vào fields ───────────────────
        case 'true_false':
            // Audio + image → AudioImageJudge
            if (question.questionAudio && question.questionImage && !question.statement) {
                return <AudioImageJudge {...props} />;
            }
            // Audio + ★ statement → AudioStatementJudge
            if (question.questionAudio && question.statement) {
                return <AudioStatementJudge {...props} />;
            }
            // Passage + ★ statement → ParagraphStatementJudge
            if (question.passage && question.statement) {
                return <ParagraphStatementJudge {...props} />;
            }
            // Image + Hanzi → ImageCharJudge
            if (question.questionImage && question.questionText && !question.questionAudio) {
                return <ImageCharJudge {...props} />;
            }
            return <LegacyTrueFalse {...props} />;

        // ─── multiple_choice: chọn variant dựa vào fields ──────────────
        case 'multiple_choice':
            if (question.passage) {
                return <ParagraphMcq {...props} />;
            }
            if (question.questionAudio) {
                return <AudioMcqShort {...props} />;
            }
            return <LegacyMcq {...props} />;

        // ─── Legacy types ──────────────────────────────────────────────
        case 'fill_blank':
            return <LegacyFillBlank {...props} />;

        case 'short_answer':
            return <LegacyShortAnswer {...props} />;

        case 'sentence_order':
        case 'error_identify':
        case 'image_match':
            return <LegacyMcq {...props} />;

        default:
            return <LegacyMcq {...props} />;
    }
}
