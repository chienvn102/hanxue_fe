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
