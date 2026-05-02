// Shared types and constants for HSK admin

export const HSK_COLORS: Record<number, string> = {
    1: 'bg-green-500', 2: 'bg-teal-500', 3: 'bg-blue-500',
    4: 'bg-purple-500', 5: 'bg-orange-500', 6: 'bg-red-500'
};

export const EXAM_TYPES = [
    { value: 'practice', label: 'Luyện tập' },
    { value: 'mock', label: 'Đề mẫu' },
    { value: 'official', label: 'Đề chính thức' }
];

export const SECTION_TYPES = [
    { value: 'listening', label: 'Nghe hiểu' },
    { value: 'reading', label: 'Đọc hiểu' },
    { value: 'writing', label: 'Viết' }
];

export interface QuestionTypeOption {
    value: string;
    label: string;
    icon: string;
    desc: string;
}

export const QUESTION_TYPES_BY_SECTION: Record<string, QuestionTypeOption[]> = {
    listening: [
        { value: 'true_false', label: 'Đúng / Sai', icon: '✅', desc: 'Nghe → đúng hay sai' },
        { value: 'image_match', label: 'Ghép ảnh', icon: '🖼️', desc: 'Nghe → chọn hình phù hợp' },
        { value: 'image_grid_match', label: 'Lưới ảnh A-F', icon: '🔢', desc: 'Nghe → chọn 1 ảnh trong lưới 5-6 ảnh dùng chung' },
        { value: 'multiple_choice', label: 'Trắc nghiệm nghe', icon: '🎧', desc: 'Nghe → chọn A/B/C/D' },
        { value: 'reply_match', label: 'Ghép câu trả lời', icon: '💬', desc: 'Nghe câu hỏi → ghép câu trả lời từ bank' },
    ],
    reading: [
        { value: 'multiple_choice', label: 'Đọc hiểu trắc nghiệm', icon: '📄', desc: 'Đọc → chọn A/B/C/D' },
        { value: 'fill_blank', label: 'Điền vào chỗ trống', icon: '✏️', desc: 'Đọc → điền từ phù hợp' },
        { value: 'word_bank_fill', label: 'Điền từ vào câu (bank)', icon: '🧩', desc: 'Chọn 1 từ trong bank chung điền vào chỗ trống' },
        { value: 'image_grid_match', label: 'Ghép ảnh-câu', icon: '🖼️', desc: 'Đọc câu → chọn 1 ảnh trong lưới' },
        { value: 'true_false', label: 'Đúng / Sai (paragraph)', icon: '✅', desc: 'Đọc đoạn → judge ★ statement' },
        { value: 'sentence_order', label: 'Sắp xếp câu', icon: '🔀', desc: 'Sắp xếp từ thành câu' },
        { value: 'error_identify', label: 'Tìm câu sai', icon: '❌', desc: 'Chọn câu có lỗi' },
    ],
    writing: [
        { value: 'sentence_assembly', label: 'Lắp ghép câu', icon: '🧱', desc: 'Sắp xếp các mẩu thành câu hoàn chỉnh' },
        { value: 'fill_hanzi', label: 'Viết Hán theo pinyin', icon: '🖋️', desc: 'Viết 1 chữ Hán điền vào ( ) theo pinyin' },
        { value: 'short_answer', label: 'Viết ngắn', icon: '📝', desc: 'Viết câu / đoạn ngắn' },
        { value: 'sentence_order', label: 'Sắp xếp câu', icon: '🔀', desc: 'Sắp xếp từ thành câu' },
    ],
};

// Flat list for backward compat (label lookup in question list)
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
    { value: 'sentence_order', label: 'Sắp xếp câu' },
    { value: 'error_identify', label: 'Tìm câu sai' },
    { value: 'short_answer', label: 'Viết ngắn' },
];

export const HSK_PRESETS: Record<number, { duration_minutes: number; passing_score: number }> = {
    1: { duration_minutes: 35, passing_score: 120 },
    2: { duration_minutes: 50, passing_score: 120 },
    3: { duration_minutes: 85, passing_score: 180 },
    4: { duration_minutes: 100, passing_score: 180 },
    5: { duration_minutes: 125, passing_score: 180 },
    6: { duration_minutes: 140, passing_score: 180 },
};

export interface QuestionFormData {
    question_number: number;
    question_type: string;
    question_text: string;
    passage: string;             // HSK 2/3 reading paragraph
    statement: string;            // HSK 3 listening ★ T/F
    question_image: string;
    question_audio: string;
    transcript: string;           // Văn bản gốc của audio
    audio_start_time: number;
    audio_end_time: number;
    audio_play_count: number;
    options: string[];            // Legacy plain text — admin form vẫn dùng string[] để giữ tương thích
    options_pinyin: string[];     // Pinyin tương ứng options[i] — render Cách A
    option_images: string[];
    correct_answer: string;
    explanation: string;
    difficulty: number;
    points: number;
    group_id: number | null;      // FK tới hsk_question_groups
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
