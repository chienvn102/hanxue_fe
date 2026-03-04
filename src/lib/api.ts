// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

// Types
export interface Vocabulary {
    id: number;
    simplified: string;
    traditional?: string;
    pinyin: string;
    hanViet?: string;
    meaningVi: string;
    meaningEn?: string;
    hskLevel?: number;
    wordType?: string;
    audioUrl?: string;
    frequencyRank?: number;
    examples?: { zh: string; pinyin: string; vi: string }[];
}

export interface Character {
    id: number;
    hanzi: string;
    pinyinMain?: string;
    pinyinVariants: string[];
    hanViet?: string;
    meaningVi?: string;
    meaningEn?: string;
    strokeCount?: number;
    strokeOrder: string[];
    radical?: string;
    radicalMeaning?: string;
    components: string[];
    decomposition?: string;
    hskLevel?: number;
    frequencyRank?: number;
    mnemonicsVi?: string;
}

export interface User {
    id: number;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    role?: 'user' | 'admin';
    targetHsk?: number;
    isPremium?: boolean;
    dailyGoalMins?: number;
    totalXp?: number;
    currentStreak?: number;
    longestStreak?: number;
    totalStudyDays?: number;
    lastStudyDate?: string;
    nativeLanguage?: string;
    createdAt?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

// API Functions
export async function fetchVocab(params: {
    limit?: number;
    page?: number;
    hsk?: number;
    q?: string;
}): Promise<{ data: Vocabulary[]; pagination: { total: number; limit: number; page: number; totalPages: number } }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.hsk) searchParams.set('hsk', params.hsk.toString());
    if (params.q) searchParams.set('q', params.q);

    const res = await fetch(`${API_BASE_URL}/api/vocab?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch vocabulary');
    return res.json();
}

export async function fetchVocabById(id: number): Promise<Vocabulary> {
    const res = await fetch(`${API_BASE_URL}/api/vocab/${id}`);
    if (!res.ok) throw new Error('Vocabulary not found');
    return res.json();
}

export async function searchVocab(query: string): Promise<Vocabulary[]> {
    const res = await fetch(`${API_BASE_URL}/api/vocab?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.data;
}

export async function fetchCharacter(hanzi: string): Promise<Character> {
    const res = await fetch(`${API_BASE_URL}/api/characters/${encodeURIComponent(hanzi)}`);
    if (!res.ok) throw new Error('Character not found');
    return res.json();
}

export async function fetchCharacterBreakdown(word: string): Promise<{ characters: Character[] }> {
    const res = await fetch(`${API_BASE_URL}/api/characters/word/${encodeURIComponent(word)}`);
    if (!res.ok) throw new Error('Failed to break down word');
    return res.json();
}

// Auth Functions
export async function login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Login failed');
    }
    return res.json();
}

export async function register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Registration failed');
    }
    return res.json();
}

// Audio Helper
export function getAudioUrl(audioPath: string): string {
    if (audioPath.startsWith('http')) return audioPath;
    return `${API_BASE_URL}${audioPath}`;
}

// Media URL helper — normalizes relative paths from BE to absolute URLs
export function getMediaUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
}

export async function playAudio(word: string): Promise<void> {
    const audioUrl = `${API_BASE_URL}/audio/cmn-${encodeURIComponent(word)}.mp3`;
    try {
        const audio = new Audio(audioUrl);
        await audio.play();
    } catch (error) {
        // Fallback: Browser TTS
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    }
}

// ============================================================
// SRS (Spaced Repetition System) Types & Functions
// ============================================================

export interface VocabProgress {
    masteryLevel: number;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReview: string;
    timesSeen: number;
    timesCorrect: number;
}

export interface VocabWithProgress extends Vocabulary {
    progress: VocabProgress;
}

export interface LearningStats {
    totalLearned: number;
    mastered: number;
    dueToday: number;
    avgMastery: number;
    totalReviews: number;
    accuracy: number;
    masteryDistribution: Record<number, number>;
    hskDistribution: Record<number, number>;
}

export interface ReviewResult {
    success: boolean;
    vocabId: number;
    quality: number;
    qualityDescription: string;
    newProgress: VocabProgress;
}

// Helper to get auth header
function getAuthHeader(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Get vocabulary due for review today
 */
export async function fetchDueVocabs(params?: { limit?: number; hsk?: number }): Promise<{ count: number; data: VocabWithProgress[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.hsk) searchParams.set('hsk', params.hsk.toString());

    const res = await fetch(`${API_BASE_URL}/api/progress/due?${searchParams.toString()}`, {
        headers: getAuthHeader()
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch due vocabulary');
    }
    return res.json();
}

/**
 * Get new vocabulary to learn (not started yet)
 */
export async function fetchNewVocabs(params?: { limit?: number; hsk?: number }): Promise<{ count: number; data: Vocabulary[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.hsk) searchParams.set('hsk', params.hsk.toString());

    const res = await fetch(`${API_BASE_URL}/api/progress/new?${searchParams.toString()}`, {
        headers: getAuthHeader()
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch new vocabulary');
    }
    return res.json();
}

/**
 * Get user's learning statistics
 */
export async function fetchLearningStats(): Promise<LearningStats> {
    const res = await fetch(`${API_BASE_URL}/api/progress/stats`, {
        headers: getAuthHeader()
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch statistics');
    }
    return res.json();
}

/**
 * Submit vocabulary review result
 * @param vocabId - Vocabulary ID
 * @param quality - Quality rating 0-5
 *   0: Không nhớ gì
 *   1: Nhớ sai nhưng nhận ra đáp án
 *   2: Nhớ sai nhưng quen thuộc
 *   3: Nhớ đúng với nỗ lực
 *   4: Nhớ đúng sau do dự
 *   5: Nhớ đúng ngay lập tức
 * @param responseMs - Optional response time in milliseconds
 */
export async function submitReview(vocabId: number, quality: number, responseMs?: number): Promise<ReviewResult> {
    const res = await fetch(`${API_BASE_URL}/api/progress/review`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ vocabId, quality, responseMs })
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit review');
    }
    return res.json();
}

/**
 * Get progress for a specific vocabulary
 */
export async function fetchVocabProgress(vocabId: number): Promise<{ learned: boolean; progress?: VocabProgress }> {
    const res = await fetch(`${API_BASE_URL}/api/progress/${vocabId}`, {
        headers: getAuthHeader()
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch progress');
    }
    return res.json();
}

// Quality rating descriptions (Vietnamese)
export const QUALITY_RATINGS = [
    { value: 5, label: 'Hoàn hảo', description: 'Nhớ đúng ngay lập tức', color: 'emerald' }
] as const;

// ============================================================
// Grammar Functions
// ============================================================

export interface GrammarExample {
    chinese: string;
    pinyin: string;
    vietnamese: string;
}

export interface Grammar {
    id: number;
    pattern: string[];
    patternPinyin?: string[];
    patternFormula?: string;
    grammarPoint: string;
    explanation: string;
    examples: GrammarExample[];
    hskLevel: number;
    audioUrl?: string;
    createdAt?: string;
}

export async function fetchGrammarList(params?: {
    hsk?: number;
    q?: string;
    page?: number;
    limit?: number;
}): Promise<{ data: Grammar[]; pagination: { total: number; limit: number; page: number; totalPages: number } }> {
    const searchParams = new URLSearchParams();
    if (params?.hsk) searchParams.set('hsk', params.hsk.toString());
    if (params?.q) searchParams.set('q', params.q);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE_URL}/api/grammar?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch grammar list');
    return res.json();
}

export async function fetchGrammarById(id: number): Promise<Grammar> {
    const res = await fetch(`${API_BASE_URL}/api/grammar/${id}`);
    if (!res.ok) throw new Error('Grammar not found');
    return res.json();
}

// ============================================================
// User Profile Functions
// ============================================================

export async function fetchProfile(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: getAuthHeader()
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch profile');
    }
    return res.json();
}

export async function updateProfile(data: { displayName?: string; targetHsk?: number; nativeLanguage?: string }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to update profile');
    }
}

// ============================================================
// HSK Exam Functions
// ============================================================

export interface HskExam {
    id: number;
    title: string;
    hskLevel: number;
    examType: 'practice' | 'mock' | 'official';
    totalQuestions: number;
    durationMinutes: number;
    passingScore: number;
    description?: string;
}

export interface HskQuestion {
    id: number;
    questionNumber: number;
    questionType: 'image_match' | 'true_false' | 'multiple_choice' | 'fill_blank' | 'sentence_order' | 'error_identify' | 'short_answer';
    questionText?: string;
    questionImage?: string;
    questionAudio?: string;
    audioStartTime?: number;
    audioEndTime?: number;
    audioPlayCount?: number;
    options: string[];
    optionImages?: string[];
    points: number;
}

export interface HskSection {
    id: number;
    section_type: 'listening' | 'reading' | 'writing';
    section_order: number;
    title?: string;
    instructions?: string;
    total_questions: number;
    duration_seconds: number;
    audio_url?: string;
    questions: HskQuestion[];
}

export interface HskExamStartResponse {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: string;
    total_questions: number;
    duration_minutes: number;
    passing_score: number;
    attemptId: number;
    startedAt: string;
    savedAnswers: { questionId: number; answer: string }[];
    sections: HskSection[];
}

export interface HskExamAttempt {
    id: number;
    user_id: number;
    exam_id: number;
    started_at: string;
    completed_at?: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    listening_score: number;
    reading_score: number;
    writing_score: number;
    total_score: number;
    max_score: number;
    is_passed: boolean;
    correct_count: number;
    wrong_count: number;
    unanswered_count: number;
    time_spent_seconds: number;
    title?: string;
    hsk_level?: number;
}

export interface HskResultQuestion {
    id: number;
    questionNumber: number;
    questionType: string;
    questionText?: string;
    questionImage?: string;
    options: string[];
    optionImages?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
    userAnswer: string | null;
    isCorrect: boolean | null;
    pointsEarned: number;
}

export interface HskResultSection {
    id: number;
    section_type: string;
    title?: string;
    questions: HskResultQuestion[];
}

export interface HskExamResult {
    attempt: HskExamAttempt;
    exam: {
        title: string;
        hskLevel: number;
        passingScore: number;
        totalQuestions: number;
        durationMinutes: number;
        sections: HskResultSection[];
    };
}

export async function fetchHskExams(params?: { hsk?: number; type?: string; page?: number; limit?: number }): Promise<{ data: HskExam[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const searchParams = new URLSearchParams();
    if (params?.hsk) searchParams.set('hsk', params.hsk.toString());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE_URL}/api/hsk-exams/public?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch HSK exams');
    return res.json();
}

export async function startHskExam(examId: number): Promise<HskExamStartResponse> {
    const res = await fetch(`${API_BASE_URL}/api/hsk-exams/${examId}/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        }
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        const error = await res.json();
        throw new Error(error.error || 'Failed to start exam');
    }
    return res.json();
}

export async function submitHskAnswer(attemptId: number, questionId: number, answer: string, timeSpent?: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/hsk-exams/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ questionId, answer, timeSpent: timeSpent || 0 })
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to submit answer');
    }
}

export async function finishHskExam(attemptId: number): Promise<{ success: boolean; result: { listeningScore: number; readingScore: number; writingScore: number; totalScore: number; maxScore: number; isPassed: boolean; correctCount: number; wrongCount: number; unansweredCount: number } }> {
    const res = await fetch(`${API_BASE_URL}/api/hsk-exams/attempts/${attemptId}/finish`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        }
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        const error = await res.json();
        throw new Error(error.error || 'Failed to finish exam');
    }
    return res.json();
}

export async function fetchHskExamResult(attemptId: number): Promise<HskExamResult> {
    const res = await fetch(`${API_BASE_URL}/api/hsk-exams/attempts/${attemptId}/result`, {
        headers: getAuthHeader()
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch exam result');
    }
    return res.json();
}

export async function fetchHskHistory(): Promise<{ data: HskExamAttempt[] }> {
    const res = await fetch(`${API_BASE_URL}/api/hsk-exams/history`, {
        headers: getAuthHeader()
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch history');
    }
    return res.json();
}
