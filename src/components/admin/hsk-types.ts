// Shared types and constants for HSK admin

export const HSK_COLORS: Record<number, string> = {
    1: 'bg-green-500',
    2: 'bg-teal-500',
    3: 'bg-blue-500',
    4: 'bg-purple-500',
    5: 'bg-orange-500',
    6: 'bg-red-500',
};

/**
 * 2 chế độ giao bài (migration 022):
 *   - practice : audio per câu, feedback ngay, replay không giới hạn.
 *   - exam     : 1 file audio liên tục cho cả section, không feedback,
 *                không tua, audio chỉ phát 1 lần.
 *
 * Legacy values 'mock'/'official' đã được migration thu về 'exam'.
 */
export const EXAM_TYPES = [
    { value: 'practice', label: 'Luyện tập (audio từng câu)' },
    { value: 'exam', label: 'Thi (1 file audio liên tục)' },
];

export type ExamType = 'practice' | 'exam';

export const SECTION_TYPES = [
    { value: 'listening', label: 'Nghe hiểu' },
    { value: 'reading', label: 'Đọc hiểu' },
    { value: 'writing', label: 'Viết' },
];

export interface QuestionTypeOption {
    value: string;
    label: string;
    icon: string;
    desc: string;
}

export const QUESTION_TYPES_BY_SECTION: Record<string, QuestionTypeOption[]> = {
    listening: [
        { value: 'true_false', label: 'Đúng / Sai', icon: '✓', desc: 'Nghe → đúng hay sai' },
        { value: 'image_match', label: 'Ghép ảnh', icon: '▧', desc: 'Nghe → chọn hình phù hợp' },
        { value: 'image_grid_match', label: 'Lưới ảnh A-F', icon: '▦', desc: 'Nghe → chọn ảnh trong lưới dùng chung' },
        { value: 'multiple_choice', label: 'Trắc nghiệm nghe', icon: '◉', desc: 'Nghe → chọn A/B/C/D' },
        { value: 'reply_match', label: 'Ghép câu trả lời', icon: '↔', desc: 'Nghe câu hỏi → ghép câu trả lời từ bank' },
    ],
    reading: [
        { value: 'multiple_choice', label: 'Đọc hiểu trắc nghiệm', icon: '□', desc: 'Đọc → chọn A/B/C/D' },
        { value: 'fill_blank', label: 'Điền vào chỗ trống', icon: '_', desc: 'Đọc → điền từ phù hợp' },
        { value: 'word_bank_fill', label: 'Điền từ từ bank', icon: '▤', desc: 'Chọn từ trong bank chung điền vào chỗ trống' },
        { value: 'multi_blank_choice', label: 'Đa chỗ trống', icon: '≡', desc: 'HSK6: 3 blanks, chọn cụm từ' },
        { value: 'sentence_into_passage', label: 'Câu vào đoạn', icon: '¶', desc: 'HSK6: chọn câu điền vào passage' },
        { value: 'image_grid_match', label: 'Ghép ảnh-câu', icon: '▧', desc: 'Đọc câu → chọn ảnh trong lưới' },
        { value: 'true_false', label: 'Đúng / Sai paragraph', icon: '✓', desc: 'Đọc đoạn → judge statement' },
        { value: 'sentence_order', label: 'Sắp xếp câu', icon: '⇄', desc: 'Sắp xếp từ thành câu' },
        { value: 'error_identify', label: 'Tìm câu sai', icon: '!', desc: 'Chọn câu có lỗi' },
    ],
    writing: [
        { value: 'sentence_assembly', label: 'Lắp ghép câu', icon: '▣', desc: 'Sắp xếp các mẫu thành câu hoàn chỉnh' },
        { value: 'fill_hanzi', label: 'Viết Hán theo pinyin', icon: '字', desc: 'Viết chữ Hán theo pinyin gợi ý' },
        { value: 'image_keyword_sentence', label: 'Ảnh + từ khoá', icon: '▧', desc: 'HSK4: viết câu theo ảnh + keyword' },
        { value: 'short_essay', label: 'Đoạn ngắn', icon: '✎', desc: 'HSK5: ảnh + 5 keyword → đoạn 80 chữ' },
        { value: 'summary_essay', label: 'Tóm tắt', icon: '¶', desc: 'HSK6: tóm tắt bài đọc dài' },
        { value: 'short_answer', label: 'Viết ngắn', icon: '✎', desc: 'Viết câu / đoạn ngắn' },
        { value: 'sentence_order', label: 'Sắp xếp câu', icon: '⇄', desc: 'Sắp xếp từ thành câu' },
    ],
};

export const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Trắc nghiệm (A/B/C/D)' },
    { value: 'true_false', label: 'Đúng/Sai' },
    { value: 'image_match', label: 'Ghép ảnh' },
    { value: 'image_grid_match', label: 'Lưới ảnh A-F' },
    { value: 'word_bank_fill', label: 'Điền từ (bank)' },
    { value: 'reply_match', label: 'Ghép câu trả lời' },
    { value: 'fill_blank', label: 'Điền vào chỗ trống' },
    { value: 'sentence_assembly', label: 'Lắp ghép câu' },
    { value: 'fill_hanzi', label: 'Viết Hán theo pinyin' },
    { value: 'image_keyword_sentence', label: 'Ảnh + từ khoá' },
    { value: 'short_essay', label: 'Đoạn ngắn' },
    { value: 'multi_blank_choice', label: 'Đa chỗ trống' },
    { value: 'sentence_into_passage', label: 'Câu vào đoạn' },
    { value: 'summary_essay', label: 'Tóm tắt' },
    { value: 'sentence_order', label: 'Sắp xếp câu' },
    { value: 'error_identify', label: 'Tìm câu sai' },
    { value: 'short_answer', label: 'Viết ngắn' },
];

export const HSK_PRESETS: Record<number, { duration_minutes: number; passing_score: number }> = {
    1: { duration_minutes: 35, passing_score: 120 },
    2: { duration_minutes: 50, passing_score: 120 },
    3: { duration_minutes: 85, passing_score: 180 },
    4: { duration_minutes: 105, passing_score: 180 },
    5: { duration_minutes: 125, passing_score: 180 },
    6: { duration_minutes: 140, passing_score: 180 },
};

export interface SectionPreset {
    section_type: 'listening' | 'reading' | 'writing';
    section_order: number;
    title: string;
    instructions: string;
    total_questions: number;
    duration_seconds: number;
}

export const HSK_SECTION_PRESETS: Record<number, SectionPreset[]> = {
    1: [
        { section_type: 'listening', section_order: 1, title: 'Nghe (听力)', instructions: 'Nghe và chọn đáp án', total_questions: 20, duration_seconds: 900 },
        { section_type: 'reading', section_order: 2, title: 'Đọc (阅读)', instructions: 'Đọc và chọn đáp án', total_questions: 20, duration_seconds: 1020 },
    ],
    2: [
        { section_type: 'listening', section_order: 1, title: 'Nghe (听力)', instructions: 'Nghe và chọn đáp án', total_questions: 35, duration_seconds: 1500 },
        { section_type: 'reading', section_order: 2, title: 'Đọc (阅读)', instructions: 'Đọc và chọn đáp án', total_questions: 25, duration_seconds: 1320 },
    ],
    3: [
        { section_type: 'listening', section_order: 1, title: 'Nghe (听力)', instructions: 'Nghe và chọn đáp án', total_questions: 40, duration_seconds: 2100 },
        { section_type: 'reading', section_order: 2, title: 'Đọc (阅读)', instructions: 'Đọc và chọn đáp án', total_questions: 30, duration_seconds: 1800 },
        { section_type: 'writing', section_order: 3, title: 'Viết (书写)', instructions: 'Hoàn thành câu / viết Hán', total_questions: 10, duration_seconds: 900 },
    ],
    4: [
        { section_type: 'listening', section_order: 1, title: 'Nghe (听力)', instructions: 'Nghe và chọn đáp án', total_questions: 45, duration_seconds: 1800 },
        { section_type: 'reading', section_order: 2, title: 'Đọc (阅读)', instructions: 'Đọc và chọn đáp án', total_questions: 40, duration_seconds: 2400 },
        { section_type: 'writing', section_order: 3, title: 'Viết (书写)', instructions: 'Hoàn thành câu / viết câu theo ảnh', total_questions: 15, duration_seconds: 1500 },
    ],
    5: [
        { section_type: 'listening', section_order: 1, title: 'Nghe (听力)', instructions: 'Nghe và chọn đáp án', total_questions: 45, duration_seconds: 1800 },
        { section_type: 'reading', section_order: 2, title: 'Đọc (阅读)', instructions: 'Đọc và chọn đáp án', total_questions: 45, duration_seconds: 2700 },
        { section_type: 'writing', section_order: 3, title: 'Viết (书写)', instructions: 'Viết câu / đoạn văn ngắn', total_questions: 10, duration_seconds: 2700 },
    ],
    6: [
        { section_type: 'listening', section_order: 1, title: 'Nghe (听力)', instructions: 'Nghe và chọn đáp án', total_questions: 50, duration_seconds: 2100 },
        { section_type: 'reading', section_order: 2, title: 'Đọc (阅读)', instructions: 'Đọc và chọn đáp án', total_questions: 50, duration_seconds: 3000 },
        { section_type: 'writing', section_order: 3, title: 'Viết (书写)', instructions: 'Đọc bài và viết tóm tắt', total_questions: 1, duration_seconds: 2700 },
    ],
};

/**
 * Bảng "mẫu đề" — mỗi section là danh sách part theo thứ tự { count, type }.
 * MIRROR từ BE `hanxue_be/src/services/hsk-exam-template.service.js` (TEMPLATES).
 * ⚠️ KEEP IN SYNC: nếu đổi cấu trúc đề ở BE, cập nhật bảng này.
 *
 * Dùng để KHÓA loại câu hỏi: loại câu đã cố định theo level HSK, admin không chọn lại.
 */
type TypePlanPart = { count: number; type: string };
type SectionTypeKey = 'listening' | 'reading' | 'writing';

export const HSK_QUESTION_PLAN: Record<number, Partial<Record<SectionTypeKey, TypePlanPart[]>>> = {
    1: {
        listening: [{ count: 5, type: 'true_false' }, { count: 5, type: 'image_grid_match' }, { count: 5, type: 'reply_match' }, { count: 5, type: 'multiple_choice' }],
        reading: [{ count: 5, type: 'image_grid_match' }, { count: 5, type: 'true_false' }, { count: 5, type: 'reply_match' }, { count: 5, type: 'word_bank_fill' }],
    },
    2: {
        listening: [{ count: 10, type: 'true_false' }, { count: 10, type: 'image_grid_match' }, { count: 10, type: 'reply_match' }, { count: 5, type: 'multiple_choice' }],
        reading: [{ count: 5, type: 'image_grid_match' }, { count: 5, type: 'word_bank_fill' }, { count: 5, type: 'true_false' }, { count: 10, type: 'multiple_choice' }],
    },
    3: {
        listening: [{ count: 10, type: 'image_grid_match' }, { count: 10, type: 'true_false' }, { count: 10, type: 'multiple_choice' }, { count: 10, type: 'multiple_choice' }],
        reading: [{ count: 10, type: 'reply_match' }, { count: 10, type: 'word_bank_fill' }, { count: 10, type: 'multiple_choice' }],
        writing: [{ count: 5, type: 'sentence_assembly' }, { count: 5, type: 'fill_hanzi' }],
    },
    4: {
        listening: [{ count: 10, type: 'true_false' }, { count: 15, type: 'multiple_choice' }, { count: 20, type: 'multiple_choice' }],
        reading: [{ count: 10, type: 'word_bank_fill' }, { count: 10, type: 'multiple_choice' }, { count: 20, type: 'multiple_choice' }],
        writing: [{ count: 10, type: 'sentence_assembly' }, { count: 5, type: 'image_keyword_sentence' }],
    },
    5: {
        listening: [{ count: 20, type: 'multiple_choice' }, { count: 25, type: 'multiple_choice' }],
        reading: [{ count: 15, type: 'word_bank_fill' }, { count: 10, type: 'multiple_choice' }, { count: 20, type: 'multiple_choice' }],
        writing: [{ count: 8, type: 'sentence_assembly' }, { count: 2, type: 'short_essay' }],
    },
    6: {
        listening: [{ count: 15, type: 'multiple_choice' }, { count: 15, type: 'multiple_choice' }, { count: 20, type: 'multiple_choice' }],
        reading: [{ count: 10, type: 'error_identify' }, { count: 10, type: 'multi_blank_choice' }, { count: 10, type: 'sentence_into_passage' }, { count: 20, type: 'multiple_choice' }],
        writing: [{ count: 1, type: 'summary_essay' }],
    },
};

/**
 * Suy ra question_type cố định theo mẫu đề HSK cho câu thứ `indexInSection` (1-based)
 * trong section — dùng khi THÊM câu thủ công (loại câu bị khóa theo template).
 * Fallback: part cuối nếu vượt tổng số câu mẫu; 'multiple_choice' nếu chưa có plan.
 */
export function deriveQuestionType(level: number, sectionType: string, indexInSection: number): string {
    const parts = HSK_QUESTION_PLAN[level]?.[sectionType as SectionTypeKey];
    if (!parts || parts.length === 0) return 'multiple_choice';
    let acc = 0;
    for (const part of parts) {
        acc += part.count;
        if (indexInSection <= acc) return part.type;
    }
    return parts[parts.length - 1].type;
}

export const HSK_AVAILABLE_LEVELS: number[] = [1, 2, 3, 4, 5, 6];

export interface QuestionFormData {
    question_number: number;
    question_type: string;
    question_text: string;
    passage: string;
    statement: string;
    question_image: string;
    question_audio: string;
    transcript: string;
    audio_start_time: number;
    audio_end_time: number;
    audio_play_count: number;
    options: string[];
    options_pinyin: string[];
    option_images: string[];
    correct_answer: string;
    explanation: string;
    difficulty: number;
    points: number;
    group_id: number | null;
    meta: Record<string, unknown> | null;
}

export const DEFAULT_QUESTION_FORM: QuestionFormData = {
    question_number: 1,
    question_type: 'multiple_choice',
    question_text: '',
    passage: '',
    statement: '',
    question_image: '',
    question_audio: '',
    transcript: '',
    audio_start_time: 0,
    audio_end_time: 0,
    audio_play_count: 2,
    options: ['', '', '', ''],
    options_pinyin: ['', '', '', ''],
    option_images: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    difficulty: 1,
    points: 1,
    group_id: null,
    meta: null,
};

export const SECTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    listening: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', label: 'Nghe' },
    reading: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', label: 'Đọc' },
    writing: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', label: 'Viết' },
};
