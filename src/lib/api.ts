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
    targetHsk: number;
    dailyGoalMins: number;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
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
