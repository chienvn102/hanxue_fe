// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

// Types
export interface VocabTheme {
    id: number;
    slug: string;
    name_vi: string;
    name_en?: string | null;
    icon?: string | null;
    color?: string | null;
    sort_order?: number;
}

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
    themes?: VocabTheme[];
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
    completedHskLevels?: number[];
    isPremium?: boolean;
    dailyGoalMins?: number;
    totalXp?: number;
    currentStreak?: number;
    longestStreak?: number;
    totalStudyDays?: number;
    lastStudyDate?: string;
    nativeLanguage?: string;
    preferredVoice?: 'male' | 'female';
    createdAt?: string;
    hasPassword?: boolean;
    profileCompleted?: boolean;
    requiresOnboarding?: boolean;
    emailVerified?: boolean;
    googleLinked?: boolean;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface RegisterResponse {
    message: string;
    userId: number;
}

export interface FlashcardDeck {
    id: number;
    name: string;
    description?: string | null;
    source_type: 'manual' | 'notebook' | 'theme' | 'lesson' | 'hsk';
    source_ref?: string | null;
    card_count: number;
    created_at: string;
    last_studied_at?: string | null;
}

export interface FlashcardSessionCard {
    id: number;
    simplified: string;
    traditional: string;
    pinyin: string;
    hanViet: string;
    meaningVi: string;
    meaningEn: string;
    hskLevel: number;
}

// API Functions
export async function fetchVocab(params: {
    limit?: number;
    page?: number;
    hsk?: number;
    q?: string;
    theme?: string;
}): Promise<{ data: Vocabulary[]; pagination: { total: number; limit: number; page: number; totalPages: number } }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.hsk) searchParams.set('hsk', params.hsk.toString());
    if (params.q) searchParams.set('q', params.q);
    if (params.theme) searchParams.set('theme', params.theme);

    const res = await fetch(`${API_BASE_URL}/api/vocab?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch vocabulary');
    return res.json();
}

export async function fetchVocabThemes(): Promise<VocabTheme[]> {
    const res = await fetch(`${API_BASE_URL}/api/vocab/themes`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
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

export async function getVapidPublicKey(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/notifications/vapid-public-key`);
    if (!res.ok) return '';
    const data = await res.json();
    return data.publicKey || '';
}

export async function subscribePush(subscription: PushSubscription): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
    });
    if (!res.ok) throw new Error('Failed to subscribe push notifications');
}

// ============================================================
// Notification feed (in-app bell)
// ============================================================

export interface NotificationItem {
    id: number;
    title: string;
    body: string;
    url: string | null;
    tag: string | null;
    type?: string;
    icon?: string | null;
    read_at: string | null;
    created_at: string;
}

export async function fetchPendingNotifications(): Promise<NotificationItem[]> {
    const res = await authFetch(`${API_BASE_URL}/api/notifications/pending`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as NotificationItem[]) : [];
}

export async function fetchUnreadCount(): Promise<number> {
    const res = await authFetch(`${API_BASE_URL}/api/notifications/unread-count`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.success ? (data.data?.count || 0) : 0;
}

export async function markNotificationRead(id: number): Promise<void> {
    await authFetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead(): Promise<void> {
    await authFetch(`${API_BASE_URL}/api/notifications/read-all`, { method: 'PUT' });
}

// ----- Notification preferences -----

export interface NotificationPreferences {
    daily_reminder_enabled: number;
    daily_reminder_time: string;
    streak_warning_enabled: number;
    level_up_enabled: number;
    course_update_enabled: number;
    timezone: string;
    srs_review_push_enabled: number;
    srs_review_email_enabled: number;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences | null> {
    const res = await authFetch(`${API_BASE_URL}/api/notifications/preferences`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? (json.data as NotificationPreferences) : null;
}

export async function updateNotificationPreferences(
    payload: Partial<NotificationPreferences>
): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Không cập nhật được cài đặt thông báo');
    }
}

// ============================================================
// Activity log
// ============================================================

export interface ActivityItem {
    id: number;
    eventType: string;
    title: string | null;
    icon: string | null;
    payload: Record<string, unknown> | null;
    createdAt: string;
}

export async function fetchRecentActivity(limit = 20): Promise<ActivityItem[]> {
    const res = await authFetch(`${API_BASE_URL}/api/activity/recent?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as ActivityItem[]) : [];
}

// ============================================================
// Achievements
// ============================================================

export interface AchievementItem {
    key: string;
    name: string;
    target: number;
    icon: string;
    earned: boolean;
    earnedAt: string | null;
    metricValue: number | null;
}

export async function fetchAchievements(): Promise<AchievementItem[]> {
    const res = await authFetch(`${API_BASE_URL}/api/achievements`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as AchievementItem[]) : [];
}

export async function fetchFlashcardDecks(): Promise<FlashcardDeck[]> {
    const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks`);
    if (!res.ok) throw new Error('Failed to fetch flashcard decks');
    const data = await res.json();
    return data.data || [];
}

export async function createFlashcardDeck(input: {
    name: string;
    description?: string;
    source_type: FlashcardDeck['source_type'];
    source_ref?: string;
}): Promise<{ id: number }> {
    const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to create flashcard deck');
    const data = await res.json();
    return data.data;
}

export interface FlashcardDeckItem {
    id: number;
    simplified: string;
    traditional: string | null;
    pinyin: string;
    hanViet?: string | null;
    meaningVi: string;
    meaningEn?: string | null;
    hskLevel: number;
    addedAt?: string;
}

export async function fetchFlashcardDeckItems(deckId: number): Promise<FlashcardDeckItem[]> {
    const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks/${deckId}/items`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không tải được danh sách thẻ');
    }
    const data = await res.json();
    return (data.data || []) as FlashcardDeckItem[];
}

export async function updateFlashcardDeck(deckId: number, patch: { name?: string; description?: string | null }): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks/${deckId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không cập nhật được bộ thẻ');
    }
}

export async function deleteFlashcardDeck(deckId: number): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks/${deckId}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không xoá được bộ thẻ');
    }
}

export async function addFlashcardDeckItem(deckId: number, vocabId: number): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks/${deckId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocab_id: vocabId }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không thêm được thẻ');
    }
}

export async function removeFlashcardDeckItem(deckId: number, vocabId: number): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks/${deckId}/items/${vocabId}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không xoá được thẻ');
    }
}

export async function fetchFlashcardSession(params: {
    deck?: string;
    hsk?: string;
    limit?: string;
    lesson?: string | number;
}): Promise<{ count: number; flashcards: FlashcardSessionCard[] }> {
    const qs = new URLSearchParams({ limit: params.limit || '20' });
    if (params.deck) {
        const res = await authFetch(`${API_BASE_URL}/api/flashcard/decks/${params.deck}/session?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch deck flashcards');
        return res.json();
    }
    if (params.hsk) qs.set('hsk', params.hsk);
    if (params.lesson) qs.set('lesson', String(params.lesson));
    const res = await fetch(`${API_BASE_URL}/api/flashcard?${qs.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch flashcards');
    return res.json();
}

export async function completeWritePractice(stats: {
    charactersCompleted: number;
    totalMistakes: number;
}): Promise<{ success: boolean; xpEarned: number }> {
    const res = await authFetch(`${API_BASE_URL}/api/practice/write-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
    });
    if (!res.ok) throw new Error('Failed to record write practice');
    return res.json();
}

// ============================================================
// Writing SRS Practice (Feature 2 — 3-stage per character)
// ============================================================

export type WritingStage = 1 | 2 | 3;

export interface WritingCharacter {
    hanzi: string;
    strokeCount: number;
    strokeOrder: string[];
    pinyin: string;
    meaningVi: string;
    currentStage: WritingStage;
    masteryLevel: number;
    totalAttempts: number;
    nextReviewAt: string | null;
}

export interface WritingWordResponse {
    simplified: string;
    wordMeta: {
        simplified: string;
        traditional: string | null;
        pinyin: string;
        meaningVi: string;
        audioUrl: string | null;
        vocabId: number;
    } | null;
    characters: WritingCharacter[];
}

export interface WritingDueItem {
    hanzi: string;
    pinyin: string;
    meaningVi: string;
    currentStage: WritingStage;
    masteryLevel: number;
    nextReviewAt: string | null;
    totalAttempts: number;
    totalMistakes: number;
}

export interface WritingSubmitResponse {
    character: string;
    currentStage: WritingStage;
    masteryLevel: number;
    easeFactor: number;
    intervalDays: number;
    nextReviewAt: string;
    scoreLabel: 'perfect' | 'pass' | 'fail';
    graduated: boolean;
    xpEarned: number;
}

export async function fetchWritingWord(simplified: string): Promise<WritingWordResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/writing/word?simplified=${encodeURIComponent(simplified)}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không lấy được dữ liệu chữ');
    }
    const data = await res.json();
    return data.data as WritingWordResponse;
}

export async function fetchWritingDue(limit = 10): Promise<WritingDueItem[]> {
    const res = await authFetch(`${API_BASE_URL}/api/writing/due?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.success ? data.data : []) as WritingDueItem[];
}

export async function submitWritingAttempt(payload: {
    character: string;
    stage: WritingStage;
    mistakes: number;
    strokeCount: number;
}): Promise<WritingSubmitResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/writing/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không gửi được kết quả');
    }
    const data = await res.json();
    return data.data as WritingSubmitResponse;
}

export async function googleLogin(credential: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Google login failed');
    }
    return res.json();
}

export async function register(email: string, password: string, displayName?: string): Promise<RegisterResponse> {
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

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to request password reset');
    }
    return res.json();
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to reset password');
    }
    return res.json();
}

export interface ProfileUpdatePayload {
    displayName?: string;
    targetHsk?: number;
    nativeLanguage?: string;
    dailyGoalMins?: number;
    preferredVoice?: 'male' | 'female';
    avatarUrl?: string | null;
}

export interface OnboardingPayload extends ProfileUpdatePayload {
    newPassword: string;
}

export async function sendPasswordChangeCode(): Promise<{ message: string }> {
    const res = await authFetch(`${API_BASE_URL}/api/user/password-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to send verification code');
    }
    return res.json();
}

export async function completeOnboarding(payload: OnboardingPayload): Promise<User> {
    const res = await authFetch(`${API_BASE_URL}/api/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to complete onboarding');
    }
    return res.json();
}

export async function changePassword(payload: {
    currentPassword?: string;
    newPassword: string;
    code: string;
}): Promise<{ message: string }> {
    const res = await authFetch(`${API_BASE_URL}/api/user/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to change password');
    }
    return res.json();
}

// Audio Helper
export function getAudioUrl(audioPath: string): string {
    if (audioPath.startsWith('http')) return audioPath;
    return `${API_BASE_URL}${audioPath}`;
}

// Media URL helper — normalizes relative paths from BE to absolute URLs.
// Returns '' for gs:// or other non-HTTP refs so callers can fall back to placeholder UI
// (the resolver lives on BE — gs:// values should be resolved server-side before reaching FE).
export function getMediaUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
    // Unknown scheme (gs://, etc.) → don't construct a broken URL
    return '';
}

/**
 * Phát audio cho 1 từ. Ưu tiên `customUrl` (signed URL từ vocab.audioUrl, ví dụ
 * audio admin đã gen bằng AI/upload thủ công) → fallback `/audio/cmn-{word}.mp3`
 * (corpus edge-tts cũ) → fallback browser speechSynthesis.
 */
export async function playAudio(word: string, customUrl?: string | null): Promise<void> {
    const candidates: string[] = [];
    if (customUrl) candidates.push(customUrl);
    candidates.push(`${API_BASE_URL}/audio/cmn-${encodeURIComponent(word)}.mp3`);

    for (const url of candidates) {
        try {
            const audio = new Audio(url);
            await audio.play();
            return; // play thành công → dừng tìm fallback
        } catch {
            // tiếp tục thử URL kế tiếp
        }
    }

    // All fallbacks fail → browser TTS
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

// ============================================================
// Progress Tracking Types & Functions (HF4: SRS removed — flashcard
// session vẫn POST /review để cộng dồn times_seen/correct/wrong.)
// ============================================================

export interface VocabProgress {
    masteryLevel: number;
    timesSeen: number;
    timesCorrect: number;
    timesWrong?: number;
    lastReviewed?: string;
    avgResponseMs?: number;
}

export interface LearningStats {
    totalLearned: number;
    mastered: number;
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
    correct: boolean;
    xpEarned: number;
}

// Helper to get auth header
function getAuthHeader(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Centralized auth fetch wrapper: auto-refresh on 401, retry once
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) return null;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
            return data.accessToken;
        }
        return null;
    } catch {
        return null;
    }
}

// 90s default — đủ cho Groq 60s timeout + retries phía BE.
// Endpoint AI chậm hơn endpoint thường nên cần dài hơn fetch mặc định.
const FETCH_TIMEOUT_MS = 90000;

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = { ...getAuthHeader(), ...options.headers };

    // Wrap fetch trong AbortController để có timeout rõ ràng (browser ko có default).
    const doFetch = async (h: HeadersInit): Promise<Response> => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        try {
            return await fetch(url, { ...options, headers: h, signal: ctrl.signal });
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') {
                throw new Error('Server phản hồi quá chậm (timeout). Thử lại nhé.');
            }
            throw e;
        } finally {
            clearTimeout(t);
        }
    };

    let res = await doFetch(headers);

    if (res.status === 401) {
        // Deduplicate concurrent refresh attempts
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = tryRefreshToken().finally(() => { isRefreshing = false; });
        }
        const newToken = await refreshPromise;
        if (newToken) {
            const retryHeaders = { ...options.headers, 'Authorization': `Bearer ${newToken}` };
            res = await doFetch(retryHeaders);
        }
    }

    return res;
}

/**
 * Get user's learning statistics
 */
export async function fetchLearningStats(): Promise<LearningStats> {
    const res = await authFetch(`${API_BASE_URL}/api/progress/stats`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch statistics');
    }
    return res.json();
}

/**
 * Submit a flashcard review result.
 * @param vocabId - Vocabulary ID
 * @param quality - 0–5 (≥3 = correct). FE flashcard hiện chỉ truyền 5 hoặc 0.
 * @param responseMs - optional time-to-answer in milliseconds
 */
export async function submitReview(vocabId: number, quality: number, responseMs?: number): Promise<ReviewResult> {
    const res = await authFetch(`${API_BASE_URL}/api/progress/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabId, quality, responseMs })
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit review');
    }
    return res.json();
}

// ============================================================
// Practice — Match game (HF4.3)
// Server giữ session với token; client phải dùng token để claim từng cặp.
// ============================================================

export interface MatchPair {
    id: number;
    simplified: string;
    pinyin: string;
    meaningVi: string;
}

export interface MatchSession {
    token: string;
    pairs: MatchPair[];
}

export async function fetchMatchSession(params: { hsk?: number; limit?: number; lesson?: number }): Promise<MatchSession> {
    const sp = new URLSearchParams();
    if (params.hsk) sp.set('hsk', String(params.hsk));
    sp.set('limit', String(params.limit || 8));
    if (params.lesson) sp.set('lesson', String(params.lesson));
    const res = await authFetch(`${API_BASE_URL}/api/practice/match?${sp.toString()}`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch match pairs');
    }
    const json = await res.json();
    return { token: json.token, pairs: json.pairs || [] };
}

export async function clearMatchPair(token: string, vocabId: number): Promise<{ xpEarned: number; cleared: number; total: number }> {
    const res = await authFetch(`${API_BASE_URL}/api/practice/match-clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, vocabId }),
    });
    if (!res.ok) return { xpEarned: 0, cleared: 0, total: 0 };
    const json = await res.json();
    return {
        xpEarned: json.data?.xpEarned || 0,
        cleared: json.data?.cleared || 0,
        total: json.data?.total || 0,
    };
}

// ============================================================
// Practice — Translate game (HF4.4)
// Server giữ vi + expected_zh (KHÔNG gửi về client trước khi grade).
// ============================================================

export interface TranslatePrompt {
    token: string;
    vi: string;
    hsk: number;
}

export interface TranslateGrammarIssue {
    type: string;
    found: string;
    shouldBe: string;
    explanationVi: string;
}

export interface TranslateVocabSuggestion {
    yourWord: string;
    betterWord: string;
    reasonVi: string;
}

export interface TranslateBreakdown {
    meaningAccuracy: { score: number; commentVi: string };
    grammar: { score: number; commentVi: string; issues: TranslateGrammarIssue[] };
    vocabulary: { score: number; commentVi: string; suggestions: TranslateVocabSuggestion[] };
    fluency: { score: number; commentVi: string };
}

export interface TranslateHighlight {
    type: 'good' | 'warn';
    textVi: string;
}

export interface TranslateGrade {
    score: number;
    feedbackVi: string;
    correctZh: string;
    expectedPinyin?: string;
    correctPinyin?: string;
    xpEarned: number;
    breakdown?: TranslateBreakdown | null;
    highlights?: TranslateHighlight[];
    nextPracticeHintVi?: string;
}

// Map upstream HTTP errors (502/503/504 từ nginx/Cloudflare) sang message
// nhận diện được. Giữ status trong message để friendlyErr phân loại.
async function readApiError(res: Response, fallback: string): Promise<string> {
    const ct = res.headers.get('content-type') || '';
    // Cloudflare/nginx error trả HTML, không phải JSON → status-based message.
    if (!ct.includes('application/json')) {
        if (res.status === 502) return 'Server gateway lỗi (502). BE có thể đang restart hoặc nginx timeout.';
        if (res.status === 503) return 'Server tạm thời không phản hồi (503). Thử lại sau 30s.';
        if (res.status === 504) return 'Gateway timeout (504). Server xử lý quá lâu.';
        return `${fallback} (HTTP ${res.status})`;
    }
    const body = await res.json().catch(() => ({}));
    return body.message || `${fallback} (HTTP ${res.status})`;
}

export async function fetchTranslatePrompt(hsk: number): Promise<TranslatePrompt> {
    const res = await authFetch(`${API_BASE_URL}/api/practice/translate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hsk }),
    });
    if (!res.ok) {
        throw new Error(await readApiError(res, 'Không tạo được câu dịch'));
    }
    const json = await res.json();
    return json.data;
}

export async function gradeTranslate(payload: { token: string; user_zh: string }): Promise<TranslateGrade> {
    const res = await authFetch(`${API_BASE_URL}/api/practice/translate-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error(await readApiError(res, 'Không chấm được bài dịch'));
    }
    const json = await res.json();
    return json.data;
}

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
// Grammar Quiz (seeded MCQ) — server-side session token (anti-cheat).
// /start never returns correct answers; grading happens server-side.
// ============================================================

export interface GrammarQuizQuestion {
    id: number;
    grammarPatternId: number;
    grammarPoint: string;
    hskLevel: number;
    questionType: string;
    questionText: string;
    options: string[];
}

export interface GrammarQuizStartResult {
    token: string;
    questions: GrammarQuizQuestion[];
}

export interface GrammarQuizAnswerResult {
    correct: boolean;
    correctAnswer: string;
    explanation: string;
}

export interface GrammarQuizFinishResult {
    total: number;
    answered: number;
    correct: number;
    score: number;
    xpEarned: number;
}

export async function startGrammarQuiz(params: {
    grammarIds?: number[];
    hsk?: number;
    limit?: number;
}): Promise<GrammarQuizStartResult> {
    const res = await authFetch(`${API_BASE_URL}/api/practice/grammar-quiz/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grammarIds: params.grammarIds || [],
            hsk: params.hsk,
            limit: params.limit || 10,
        }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Không tạo được phiên trắc nghiệm'));
    const json = await res.json();
    return json.data;
}

export async function answerGrammarQuiz(payload: {
    token: string;
    questionId: number;
    choice: string;
}): Promise<GrammarQuizAnswerResult> {
    const res = await authFetch(`${API_BASE_URL}/api/practice/grammar-quiz/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Không chấm được câu trả lời'));
    const json = await res.json();
    return json.data;
}

export async function finishGrammarQuiz(token: string): Promise<GrammarQuizFinishResult> {
    const res = await authFetch(`${API_BASE_URL}/api/practice/grammar-quiz/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Không hoàn tất được phiên'));
    const json = await res.json();
    return json.data;
}

// ============================================================
// Saved grammar points ("Ngữ pháp" tab in notebook)
// ============================================================

export interface SavedGrammarItem {
    grammar_pattern_id: number;
    note: string | null;
    created_at: string;
    grammar_point: string;
    pattern_formula: string | null;
    hsk_level: number;
    explanation: string;
}

export async function fetchSavedGrammarIds(): Promise<number[]> {
    const res = await authFetch(`${API_BASE_URL}/api/notebooks/grammar/ids`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
}

export async function fetchSavedGrammar(): Promise<SavedGrammarItem[]> {
    const res = await authFetch(`${API_BASE_URL}/api/notebooks/grammar`);
    if (!res.ok) throw new Error('Failed to fetch saved grammar');
    const json = await res.json();
    return json.data || [];
}

export async function toggleSaveGrammar(grammarId: number, save: boolean): Promise<boolean> {
    const res = await authFetch(`${API_BASE_URL}/api/notebooks/grammar/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grammarId, save }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Không lưu được ngữ pháp'));
    const json = await res.json();
    return json.saved === true;
}

// ============================================================
// User Profile Functions
// ============================================================

export async function fetchProfile(): Promise<User> {
    const res = await authFetch(`${API_BASE_URL}/api/user/profile`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch profile');
    }
    return res.json();
}

export async function updateProfile(data: ProfileUpdatePayload): Promise<User> {
    const res = await authFetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to update profile');
    }
    return res.json();
}

export interface AvatarUploadResult {
    /** Canonical reference for DB storage (`gs://bucket/object` for GCS, `/uploads/...` for local). */
    ref: string;
    /** Immediately-usable URL for FE display (signed URL for GCS, same path for local). */
    url: string;
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
    const form = new FormData();
    form.append('image', file);
    const res = await authFetch(`${API_BASE_URL}/api/upload/avatar`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Tải ảnh đại diện thất bại');
    }
    const data = await res.json();
    if (!data.success || !data.url) throw new Error('Phản hồi không hợp lệ từ server');
    return {
        ref: (data.ref || data.url) as string,
        url: data.url as string,
    };
}

// ============================================================
// HSK Exam Functions
// ============================================================

export interface HskExam {
    id: number;
    title: string;
    hskLevel: number;
    examType: 'practice' | 'exam';
    totalQuestions: number;
    durationMinutes: number;
    passingScore: number;
    description?: string;
}

// Question type ENUM mở rộng sau migration 006
export type HskQuestionType =
    // Legacy:
    | 'image_match'
    | 'true_false'
    | 'multiple_choice'
    | 'fill_blank'
    | 'sentence_order'
    | 'error_identify'
    | 'short_answer'
    // Mới cho HSK 1-3:
    | 'image_grid_match'
    | 'word_bank_fill'
    | 'reply_match'
    | 'sentence_assembly'
    | 'fill_hanzi'
    // HSK 4-6:
    | 'image_keyword_sentence'
    | 'short_essay'
    | 'multi_blank_choice'
    | 'sentence_into_passage'
    | 'summary_essay';

// Option dạng object có pinyin (Cách A — tách Hán/pinyin)
export interface HskOption {
    label: string;            // "A" / "B" / "C" / "D"
    text: string;             // Hán
    pinyin?: string;          // Pinyin tương ứng (optional)
}

// Group resource (image grid / word bank / reply bank / passage) dùng chung cho cụm câu
export interface HskQuestionGroup {
    id: number;
    section_id: number;
    group_type: 'image_grid' | 'word_bank' | 'reply_bank' | 'passage' | 'passage_multi';
    title_vi?: string;
    instructions_vi?: string;
    content: HskGroupContent | null;
    order_index: number;
}

export type HskGroupContent =
    | { items: { label: string; image_url: string; alt_vi?: string }[]; example?: { label: string; content: { zh: string; pinyin?: string } } }
    | { items: { label: string; word: string; pinyin?: string }[]; example?: { label: string; sentence_zh: string; sentence_pinyin?: string } }
    | { items: { label: string; sentence_zh: string; sentence_pinyin?: string }[]; example?: { label: string; prompt_zh: string; prompt_pinyin?: string } }
    | { passage_zh: string; passage_pinyin?: string; passage_vi?: string; question_refs?: number[] };

export interface HskQuestion {
    id: number;
    groupId?: number | null;
    questionNumber: number;
    questionType: HskQuestionType;
    questionText?: string;
    passage?: string;          // Đoạn văn (paragraph judge / paragraph MCQ)
    statement?: string;         // Câu khẳng định ★ để judge T/F
    questionImage?: string;
    questionAudio?: string;
    audioStartTime?: number;
    audioEndTime?: number;
    audioPlayCount?: number;
    options: string[] | HskOption[];   // Legacy có thể là string[]; mới = HskOption[]
    optionImages?: string[];
    points: number;
    meta?: Record<string, unknown> | null;
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
    groups: HskQuestionGroup[];   // shared resources cho cụm câu trong section
    questions: HskQuestion[];
}

export interface HskExamStartResponse {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: 'practice' | 'exam';
    total_questions: number;
    duration_minutes: number;
    passing_score: number;
    attemptId: number;
    startedAt: string;
    /** Legacy field — luôn rỗng sau migration 022. Giữ field để FE cũ không crash. */
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
    groupId?: number | null;
    questionNumber: number;
    questionType: string;
    questionText?: string;
    statement?: string;
    passage?: string;
    transcript?: string;
    questionImage?: string;
    options: string[] | HskOption[];
    optionImages?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
    userAnswer: string | null;
    isCorrect: boolean | null;
    pointsEarned: number;
    aiScore?: number | null;
    aiFeedback?: {
        score?: number;
        passScore?: number;
        feedbackVi?: string;
        feedbackZh?: string;
        suggestedAnswer?: string;
        criteria?: {
            task?: number;
            grammar?: number;
            vocabulary?: number;
            fluency?: number;
        };
        strengths?: string[];
        issues?: string[];
    } | null;
    aiGradedAt?: string | null;
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
    const res = await authFetch(`${API_BASE_URL}/api/hsk-exams/${examId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        const error = await res.json();
        throw new Error(error.error || 'Failed to start exam');
    }
    return res.json();
}

export async function submitHskAnswer(attemptId: number, questionId: number, answer: string, timeSpent?: number): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/hsk-exams/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer, timeSpent: timeSpent || 0 })
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to submit answer');
    }
}

export async function finishHskExam(attemptId: number): Promise<{ success: boolean; result: { listeningScore: number; readingScore: number; writingScore: number; totalScore: number; maxScore: number; isPassed: boolean; correctCount: number; wrongCount: number; unansweredCount: number; aiPendingCount?: number; requiresAiGrading?: boolean } }> {
    const res = await authFetch(`${API_BASE_URL}/api/hsk-exams/attempts/${attemptId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        const error = await res.json();
        throw new Error(error.error || 'Failed to finish exam');
    }
    return res.json();
}

// Public answer/transcript view — không cần auth, không cần attempt completed
export interface HskAnswerQuestion extends HskQuestion {
    transcript?: string;
    correctAnswer: string;
    explanation?: string;
}

export interface HskAnswerSection extends Omit<HskSection, 'questions'> {
    questions: HskAnswerQuestion[];
}

export interface HskExamAnswersResponse {
    id: number;
    title: string;
    hsk_level: number;
    exam_type: 'practice' | 'exam';
    duration_minutes: number;
    sections: HskAnswerSection[];
}

export async function fetchHskExamAnswers(examId: number): Promise<HskExamAnswersResponse> {
    const res = await fetch(`${API_BASE_URL}/api/hsk-exams/${examId}/answers`);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(error.error || 'Failed to fetch exam answers');
    }
    return res.json();
}

export async function fetchHskExamResult(attemptId: number): Promise<HskExamResult> {
    const res = await authFetch(`${API_BASE_URL}/api/hsk-exams/attempts/${attemptId}/result`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch exam result');
    }
    return res.json();
}

export async function fetchHskHistory(): Promise<{ data: HskExamAttempt[] }> {
    const res = await authFetch(`${API_BASE_URL}/api/hsk-exams/history`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch history');
    }
    return res.json();
}

// ============================================================
// AI Chat
// ============================================================

export interface ChatSendResponse {
    reply: string;
    remaining: number;
}

export interface ChatUsage {
    used: number;
    limit: number;
    isPremium: boolean;
}

export async function sendChatMessage(
    message: string,
    mode: 'chat' | 'conversation' | 'practice',
    history: { role: 'user' | 'assistant'; content: string }[]
): Promise<ChatSendResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode, history })
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Loi gui tin nhan');
    }
    const data = await res.json();
    return data.data;
}

export async function fetchChatUsage(): Promise<ChatUsage> {
    const res = await authFetch(`${API_BASE_URL}/api/chat/usage`);
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        throw new Error('Loi lay thong tin su dung');
    }
    const data = await res.json();
    return data.data;
}

// ============================================================
// AI Speech (Azure Speech via BE)
// ============================================================

export interface TranscribeResult {
    text: string;
    language: string;
    confidence: number;
}

export interface PronunciationWord {
    word: string;
    accuracyScore: number | null;
    errorType: string;
    phonemes?: PronunciationPhoneme[];
}

export interface PronunciationPhoneme {
    phoneme: string;
    accuracyScore: number;
    errorType: string;
}

export interface WeakPhoneme {
    word: string;
    phoneme: string;
    accuracyScore: number;
    errorType: string;
}

export interface PronunciationResult {
    recognizedText: string;
    referenceText: string;
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    pronunciationScore: number;
    words: PronunciationWord[];
    weakPhonemes?: WeakPhoneme[];
    /** Chinese feedback — used by TTS (sample/feedback playback) */
    feedback: string;
    /** Vietnamese feedback — shown to the learner */
    feedbackVi?: string;
}

export interface PracticeText {
    id: number;
    text: string;
    pinyin: string;
    meaning: string;
    source?: 'groq' | 'corpus';
    example?: string;
}

/** Transcribe audio to text (STT) */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const res = await authFetch(`${API_BASE_URL}/api/speech/transcribe`, {
        method: 'POST',
        body: formData,
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lỗi nhận diện giọng nói');
    }
    const data = await res.json();
    return data.data;
}

/** Assess pronunciation against reference text */
export async function assessPronunciation(audioBlob: Blob, referenceText: string): Promise<PronunciationResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('referenceText', referenceText);

    const res = await authFetch(`${API_BASE_URL}/api/speech/pronunciation`, {
        method: 'POST',
        body: formData,
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lỗi chấm phát âm');
    }
    const data = await res.json();
    return data.data;
}

/** Synthesize text to speech (returns audio blob) */
export async function synthesizeSpeech(text: string): Promise<Blob> {
    const res = await authFetch(`${API_BASE_URL}/api/speech/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lỗi tổng hợp giọng nói');
    }
    return res.blob();
}

// ============================================================
// Notebook / Saved Vocab Functions
// ============================================================

export async function fetchSavedVocabIds(): Promise<number[]> {
    const res = await authFetch(`${API_BASE_URL}/api/notebooks/saved-ids`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch saved vocab IDs');
    }
    const data = await res.json();
    return data.success ? data.data : [];
}

export async function toggleSaveVocab(vocabId: number, save: boolean): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/vocab/${vocabId}/save`, {
        method: save ? 'POST' : 'DELETE',
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(save ? 'Failed to save vocab' : 'Failed to unsave vocab');
    }
}

// ============================================================
// Course / Lesson Functions (optional auth — pass token for progress overlay)
// ============================================================

export async function fetchCourses(): Promise<{ data: unknown[]; pagination: unknown }> {
    const res = await authFetch(`${API_BASE_URL}/api/courses`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch courses');
    }
    return res.json();
}

export async function fetchCourseById(id: string | number): Promise<unknown> {
    const res = await authFetch(`${API_BASE_URL}/api/courses/${id}`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        if (res.status === 403) {
            const body = await res.json().catch(() => ({}));
            const err = new Error(body?.message || 'Khoá đã bị khoá');
            (err as { code?: string }).code = body?.code || 'COURSE_LOCKED';
            (err as { data?: unknown }).data = body?.data;
            throw err;
        }
        throw new Error('Failed to fetch course');
    }
    return res.json();
}

export async function fetchLessonsByCourse(courseId: string | number): Promise<unknown> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/course/${courseId}`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch lessons');
    }
    return res.json();
}

export async function fetchLessonById(id: string | number): Promise<unknown> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/${id}`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch lesson');
    }
    return res.json();
}

export async function updateLessonProgress(lessonId: string | number, data: { status: string; progress?: number }): Promise<unknown> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to update lesson progress');
    }
    return res.json();
}

// ============================================================================
// Textbook lesson (post-migration 004) — passage + vocab + grammar + writing
// ============================================================================

export interface TextbookLessonMeta {
    id: number;
    course_id: number;
    title: string;
    description: string | null;
    passage_zh: string | null;
    passage_pinyin: string | null;
    passage_vi: string | null;
    passage_audio_url: string | null;
    objectives_vi: string | null;
    hsk_level: number;
    order_index: number;
    is_active: boolean | number;
}

export interface TextbookVocab {
    id: number;
    link_id: number;
    order_index: number;
    note_vi: string | null;
    simplified: string;
    traditional: string | null;
    pinyin: string;
    meaning_vi: string;
    meaning_en: string | null;
    hsk_level: number | null;
    word_type: string | null;
    audio_url: string | null;
}

export interface TextbookGrammar {
    id: number;
    pattern: string[] | string | null;
    pattern_pinyin: string[] | string | null;
    pattern_formula: string | null;
    grammar_point: string;
    explanation: string;
    examples: { chinese: string; pinyin?: string; vietnamese: string }[];
    hsk_level: number | null;
    audio_url: string | null;
    order_index: number;
}

export interface TextbookWritingExercise {
    id: number;
    prompt_vi: string;
    prompt_zh: string | null;
    expected_keywords: string[];
    sample_answer_zh: string | null;
    sample_answer_pinyin: string | null;
    sample_answer_vi: string | null;
    min_chars: number;
    max_chars: number;
    order_index: number;
}

export interface TextbookHskExamLink {
    exam_id: number;
    title: string;
    hsk_level: number;
    unlock_after_complete: boolean | number;
}

export interface TextbookLessonProgress {
    status: 'in_progress' | 'completed' | 'not_started';
    vocab_done: boolean;
    passage_done: boolean;
    grammar_done: boolean;
    exercise_done: boolean;
    completed_at: string | null;
}

export interface TextbookLessonPayload {
    lesson: TextbookLessonMeta;
    vocabulary: TextbookVocab[];
    grammar: TextbookGrammar[];
    writingExercises: TextbookWritingExercise[];
    hskExams: TextbookHskExamLink[];
    progress: TextbookLessonProgress | null;
}

export async function fetchTextbookLesson(lessonId: string | number): Promise<TextbookLessonPayload> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/${lessonId}/textbook`);
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch textbook lesson');
    }
    const json = await res.json();
    return json.data;
}

// ============================================================
// Lesson meta + lesson-scoped vocab/grammar — used by practice pages
// to render group label "Từ vựng bài <title> · HSK <n>" and preselect.
// ============================================================

export interface LessonMeta {
    id: number;
    title: string;
    hsk_level: number;
    course_id: number;
    course_title: string | null;
}

export async function fetchLessonMeta(lessonId: string | number): Promise<LessonMeta | null> {
    const res = await fetch(`${API_BASE_URL}/api/lessons/${lessonId}/meta`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? (json.data as LessonMeta) : null;
}

export async function fetchLessonVocab(lessonId: string | number): Promise<Vocabulary[]> {
    const sp = new URLSearchParams({ lesson: String(lessonId), limit: '200' });
    const res = await fetch(`${API_BASE_URL}/api/vocab?${sp.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []) as Vocabulary[];
}

export async function fetchLessonGrammarIds(lessonId: string | number): Promise<number[]> {
    try {
        const payload = await fetchTextbookLesson(lessonId);
        return (payload.grammar || []).map(g => g.id);
    } catch {
        return [];
    }
}

// Lightweight typed views over the existing fetchCourses / fetchLessonsByCourse
// endpoints — used by the "Theo bài học" tab in the practice hub.
export interface CourseShort {
    id: number;
    title: string;
    hskLevel?: number;
    hsk_level?: number;
}
export interface LessonShort {
    id: number;
    title: string;
    order_index?: number;
}

export async function fetchCoursesShort(): Promise<CourseShort[]> {
    try {
        const j = await fetchCourses() as { data?: unknown[] };
        return ((j?.data as CourseShort[]) || []).filter(c => c && c.id != null);
    } catch {
        return [];
    }
}

export async function fetchLessonsShort(courseId: string | number): Promise<LessonShort[]> {
    try {
        const res = await authFetch(`${API_BASE_URL}/api/lessons/course/${courseId}`);
        if (!res.ok) return [];
        const j = await res.json() as { data?: LessonShort[] } | LessonShort[];
        // BE may wrap in {data} or return bare array depending on legacy path.
        const list = Array.isArray(j) ? j : (j as { data?: LessonShort[] })?.data || [];
        return list.filter(l => l && l.id != null);
    } catch {
        return [];
    }
}

export type LessonSection = 'vocab' | 'passage' | 'grammar' | 'exercise';

export interface MarkSectionDoneResult {
    sectionDone: LessonSection;
    allDone: boolean;
    justCompleted: boolean;
}

export async function markLessonSectionDone(lessonId: string | number, section: LessonSection): Promise<MarkSectionDoneResult> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/${lessonId}/section-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section }),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) throw new Error('Failed to mark section done');
    const json = await res.json();
    return json.data;
}

export interface WritingSubmissionResult {
    submissionId: number;
    exerciseId: number;
    lessonId: number;
    score: number;
    keywordHits: string[];
    keywordMissed: string[];
    feedback: string;
    charCount: number;
}

export async function submitWritingExercise(exerciseId: number, answerZh: string): Promise<WritingSubmissionResult> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/writing/${exerciseId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerZh }),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit writing');
    }
    const json = await res.json();
    return json.data;
}

export async function fetchNotebooks(): Promise<{ success: boolean; data: unknown[] }> {
    const res = await authFetch(`${API_BASE_URL}/api/notebooks`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch notebooks');
    }
    return res.json();
}

export async function fetchNotebookItems(notebookId: number): Promise<{ success: boolean; data: unknown[] }> {
    const res = await authFetch(`${API_BASE_URL}/api/notebooks/${notebookId}/items`);
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch notebook items');
    }
    return res.json();
}

/**
 * Fetch a practice text for the given HSK level.
 * Defaults to Groq-generated diverse text. Pass `forceCorpus=true` to force
 * the static fallback corpus (e.g. when network/Groq is unreliable).
 */
export async function fetchPracticeText(level: number, forceCorpus = false): Promise<PracticeText> {
    const params = new URLSearchParams();
    params.set('level', level.toString());
    if (forceCorpus) params.set('corpus', '1');

    const res = await authFetch(`${API_BASE_URL}/api/practice/text?${params.toString()}`);
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lỗi lấy văn bản luyện tập');
    }
    const data = await res.json();
    return data.data;
}

// ============================================================
// Lesson feedback / discussion (Feature 1)
// ============================================================

export type LessonFeedbackKind = 'comment' | 'feedback' | 'bug';
export type LessonSectionType = 'vocab' | 'passage' | 'grammar' | 'writing';

export interface LessonFeedbackItem {
    id: number;
    lesson_id: number;
    user_id: number;
    kind: LessonFeedbackKind;
    section_type: LessonSectionType | null;
    content: string;
    rating: number | null;
    parent_id: number | null;
    depth: number;
    is_resolved: 0 | 1;
    is_hidden: 0 | 1;
    is_admin_reply: 0 | 1;
    created_at: string;
    updated_at: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
}

export interface LessonFeedbackAdminItem extends Omit<LessonFeedbackItem, 'updated_at' | 'is_hidden' | 'is_admin_reply' | 'depth'> {
    lesson_title: string;
}

export async function fetchLessonFeedback(lessonId: number): Promise<LessonFeedbackItem[]> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/${lessonId}/feedback`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.data as LessonFeedbackItem[]) : [];
}

export async function postLessonFeedback(lessonId: number, payload: {
    kind: LessonFeedbackKind;
    content: string;
    sectionType?: LessonSectionType | null;
    rating?: number | null;
    parentId?: number | null;
}): Promise<number> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/${lessonId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không gửi được phản hồi');
    }
    const data = await res.json();
    return data.data?.id || 0;
}

export async function updateLessonFeedback(fid: number, content: string): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/feedback/${fid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Không sửa được');
}

export async function deleteLessonFeedback(fid: number): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/lessons/feedback/${fid}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Không xoá được');
}

// Admin — dùng adminToken (từ `/admin/login`), KHÔNG dùng accessToken user.
// BE route `/api/admin/feedback/*` chuyển sang adminMiddleware để thống nhất
// auth giữa các trang admin (tránh user phải login 2 lần).
function adminAuthHeader(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchAdminFeedback(params: { status?: string; kind?: string; limit?: number } = {}): Promise<LessonFeedbackAdminItem[]> {
    const sp = new URLSearchParams();
    if (params.status) sp.set('status', params.status);
    if (params.kind) sp.set('kind', params.kind);
    if (params.limit) sp.set('limit', String(params.limit));
    const res = await fetch(`${API_BASE_URL}/api/admin/feedback?${sp.toString()}`, {
        headers: adminAuthHeader(),
    });
    if (!res.ok) {
        let serverMessage = '';
        try {
            const errBody = await res.json();
            serverMessage = errBody?.message || '';
        } catch { /* body không phải JSON */ }
        if (res.status === 401) throw new Error('Cần đăng nhập admin. Vào /admin/login.');
        if (res.status === 403) throw new Error('Token admin không hợp lệ. Đăng nhập lại /admin/login.');
        throw new Error(serverMessage || `Không tải được danh sách phản hồi (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.success ? (data.data as LessonFeedbackAdminItem[]) : [];
}

export async function adminFeedbackBugCount(): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/admin/feedback/bug-count`, {
        headers: adminAuthHeader(),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.success ? (data.data?.count || 0) : 0;
}

export async function adminResolveFeedback(fid: number, resolved = true): Promise<void> {
    await fetch(`${API_BASE_URL}/api/admin/feedback/${fid}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
        body: JSON.stringify({ resolved }),
    });
}

export async function adminHideFeedback(fid: number, hidden = true): Promise<void> {
    await fetch(`${API_BASE_URL}/api/admin/feedback/${fid}/hide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
        body: JSON.stringify({ hidden }),
    });
}

export async function adminReplyFeedback(fid: number, content: string): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/admin/feedback/${fid}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
        body: JSON.stringify({ content }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không trả lời được');
    }
    const data = await res.json();
    return data.data?.id || 0;
}

// ============================================================
// Admin — Grammar Quiz Questions CRUD (/api/admin/grammar-quiz)
// ============================================================

export type GrammarQuizQuestionType =
    | 'multiple_choice'
    | 'fill_blank'
    | 'error_identify'
    | 'sentence_order';

export interface AdminGrammarQuizQuestion {
    id: number;
    grammar_pattern_id: number;
    grammar_point: string;
    hsk_level: number;
    question_type: GrammarQuizQuestionType;
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string | null;
    points: number;
    created_at: string;
}

export interface AdminGrammarQuizListResult {
    rows: AdminGrammarQuizQuestion[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminGrammarQuizPayload {
    grammar_pattern_id: number;
    question_type: GrammarQuizQuestionType;
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation?: string;
    points?: number;
}

async function readAdminError(res: Response, fallback: string): Promise<string> {
    if (res.status === 401) return 'Cần đăng nhập admin. Vào /admin/login.';
    if (res.status === 403) return 'Token admin không hợp lệ. Đăng nhập lại /admin/login.';
    try {
        const body = await res.json();
        return body?.message || fallback;
    } catch {
        return fallback;
    }
}

export async function adminListGrammarQuiz(params: {
    grammar_pattern_id?: number;
    hsk_level?: number;
    page?: number;
    limit?: number;
} = {}): Promise<AdminGrammarQuizListResult> {
    const sp = new URLSearchParams();
    if (params.grammar_pattern_id) sp.set('grammar_pattern_id', String(params.grammar_pattern_id));
    if (params.hsk_level) sp.set('hsk_level', String(params.hsk_level));
    sp.set('page', String(params.page || 1));
    sp.set('limit', String(params.limit || 20));

    const res = await fetch(`${API_BASE_URL}/api/admin/grammar-quiz?${sp.toString()}`, {
        headers: adminAuthHeader(),
    });
    if (!res.ok) throw new Error(await readAdminError(res, 'Không tải được danh sách câu hỏi'));
    const json = await res.json();
    return {
        rows: json.data || [],
        pagination: json.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    };
}

export async function adminGetGrammarQuiz(id: number): Promise<AdminGrammarQuizQuestion> {
    const res = await fetch(`${API_BASE_URL}/api/admin/grammar-quiz/${id}`, {
        headers: adminAuthHeader(),
    });
    if (!res.ok) throw new Error(await readAdminError(res, 'Không tải được câu hỏi'));
    const json = await res.json();
    return json.data;
}

export async function adminCreateGrammarQuiz(payload: AdminGrammarQuizPayload): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/admin/grammar-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readAdminError(res, 'Không tạo được câu hỏi'));
    const json = await res.json();
    return json.data?.id || 0;
}

export async function adminUpdateGrammarQuiz(id: number, payload: Partial<AdminGrammarQuizPayload>): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/admin/grammar-quiz/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readAdminError(res, 'Không cập nhật được câu hỏi'));
}

export async function adminDeleteGrammarQuiz(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/admin/grammar-quiz/${id}`, {
        method: 'DELETE',
        headers: adminAuthHeader(),
    });
    if (!res.ok) throw new Error(await readAdminError(res, 'Không xóa được câu hỏi'));
}
