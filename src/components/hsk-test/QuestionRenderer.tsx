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
import {
    SentenceAssembly,
    FillHanzi,
    ImageKeywordSentence,
    ShortEssay,
    SummaryEssay,
    MultiBlankChoice,
    SentenceIntoPassage,
} from './renderers/WritingRenderers';
import {
    LegacyMcq,
    ImageMatch,
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

        case 'image_keyword_sentence':
            return <ImageKeywordSentence {...props} />;

        case 'short_essay':
            return <ShortEssay {...props} />;

        case 'summary_essay':
            return <SummaryEssay {...props} />;

        case 'multi_blank_choice':
            return <MultiBlankChoice {...props} />;

        case 'sentence_into_passage':
            return <SentenceIntoPassage {...props} />;

        // ─── true_false: chọn variant dựa vào fields ───────────────────
        // ƯU TIÊN câu CÓ ẢNH trước — nếu không, các câu nghe "看图判断" (HSK1 1-5)
        // rơi vào nhánh statement-only và MẤT ảnh (AudioStatementJudge không render ảnh).
        case 'true_false':
            // Ảnh + chữ Hán (reading 21-25: ảnh + từ) → ImageCharJudge.
            if (question.questionImage && question.questionText) {
                return <ImageCharJudge {...props} />;
            }
            // Ảnh, không có chữ Hán (listening 1-5 "看图判断") → AudioImageJudge.
            // KHÔNG gate theo questionAudio: chế độ thi dùng audio liên tục ở section,
            // câu KHÔNG có audio riêng nhưng VẪN phải hiện ảnh. AudioImageJudge tự
            // ẩn player khi questionAudio rỗng.
            if (question.questionImage) {
                return <AudioImageJudge {...props} />;
            }
            // Passage + ★ statement → ParagraphStatementJudge
            if (question.passage && question.statement) {
                return <ParagraphStatementJudge {...props} />;
            }
            // Audio/statement (nghe) — AudioStatementJudge tự ẩn audio player khi
            // questionAudio rỗng (exam mode dùng audio liên tục ở section level).
            if (question.statement) {
                return <AudioStatementJudge {...props} />;
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
            return <LegacyMcq {...props} />;

        case 'image_match':
            return <ImageMatch {...props} />;

        default:
            return <LegacyMcq {...props} />;
    }
}
