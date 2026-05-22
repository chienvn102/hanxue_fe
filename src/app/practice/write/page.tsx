'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StrokeWriter from '@/components/StrokeWriter';
import { Icon } from '@/components/ui/Icon';
import {
    fetchWritingWord,
    fetchWritingDue,
    submitWritingAttempt,
    fetchVocab,
    playAudio,
    type WritingWordResponse,
    type WritingDueItem,
    type WritingStage,
    type WritingSubmitResponse,
    type Vocabulary,
} from '@/lib/api';
import { playSfx } from '@/lib/sound';
import { useAuth } from '@/components/AuthContext';

const STAGE_LABELS: Record<WritingStage, string> = {
    1: 'Stage 1/3 · Mô phỏng nét',
    2: 'Stage 2/3 · Hoàn thiện nét',
    3: 'Stage 3/3 · Vẽ tự do',
};

function PracticeWriteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const word = searchParams.get('word')?.trim() || '';

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)]"><Header />
                <div className="max-w-3xl mx-auto py-12 text-center text-[var(--text-muted)]">Đang tải...</div>
            </div>
        );
    }
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[var(--background)]"><Header />
                <div className="max-w-3xl mx-auto py-16 text-center">
                    <p className="text-[var(--text-muted)] mb-4">Vui lòng đăng nhập để luyện viết.</p>
                    <Link href="/login" className="btn-primary">Đăng nhập</Link>
                </div>
            </div>
        );
    }

    return word
        ? <WritingSession word={word} onExit={() => router.push('/practice/write')} />
        : <WritingPicker onPick={(w) => router.push(`/practice/write?word=${encodeURIComponent(w)}`)} />;
}

export default function PracticeWritePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
            <PracticeWriteContent />
        </Suspense>
    );
}

/* ========================================================================
   Picker — shown when no ?word= param
   ======================================================================== */

function WritingPicker({ onPick }: { onPick: (word: string) => void }) {
    const [due, setDue] = useState<WritingDueItem[]>([]);
    const [suggestions, setSuggestions] = useState<Vocabulary[]>([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Vocabulary[]>([]);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchWritingDue(12).catch(() => []),
            fetchVocab({ hsk: 1, limit: 12 }).then(d => d.data || []).catch(() => []),
        ]).then(([d, s]) => {
            setDue(d);
            setSuggestions(s);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const q = search.trim();
        if (q.length < 1) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        const t = setTimeout(() => {
            fetchVocab({ q, limit: 10 })
                .then(d => setSearchResults(d.data || []))
                .catch(() => setSearchResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Luyện viết chữ Hán</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Chọn một từ để bắt đầu. Mỗi chữ trong từ sẽ qua 3 giai đoạn: mô phỏng → hoàn thiện → vẽ tự do.
                    </p>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-[var(--text-muted)]">Đang tải...</div>
                ) : (
                    <>
                        {/* Due section */}
                        {due.length > 0 && (
                            <section>
                                <h2 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                                    <Icon name="schedule" size="sm" className="text-amber-500" />
                                    Đến hạn ôn lại ({due.length})
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {due.map((d) => (
                                        <button
                                            key={d.hanzi}
                                            onClick={() => onPick(d.hanzi)}
                                            className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:shadow-md transition-all text-left group"
                                        >
                                            <div className="text-4xl font-bold text-[var(--text-main)] hanzi text-center mb-2">{d.hanzi}</div>
                                            {d.pinyin && <div className="text-xs text-[var(--text-secondary)] text-center pinyin">{d.pinyin}</div>}
                                            <div className="text-[10px] text-[var(--text-muted)] text-center mt-1">Stage {d.currentStage}/3</div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Search */}
                        <section>
                            <h2 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                                <Icon name="search" size="sm" className="text-[var(--primary)]" />
                                Tìm từ vựng
                            </h2>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Gõ pinyin, hanzi hoặc nghĩa..."
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all"
                            />
                            {searching && <p className="mt-2 text-xs text-[var(--text-muted)]">Đang tìm...</p>}
                            {searchResults.length > 0 && (
                                <ul className="mt-3 space-y-2">
                                    {searchResults.map((v) => (
                                        <li key={v.id}>
                                            <button
                                                onClick={() => onPick(v.simplified)}
                                                className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors text-left"
                                            >
                                                <div>
                                                    <span className="text-2xl hanzi mr-3">{v.simplified}</span>
                                                    <span className="text-sm pinyin text-[var(--text-secondary)] mr-2">{v.pinyin}</span>
                                                    <span className="text-sm text-[var(--text-muted)]">{v.meaningVi}</span>
                                                </div>
                                                <Icon name="arrow_forward" size="sm" className="text-[var(--text-muted)]" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* HSK suggestions */}
                        {suggestions.length > 0 && (
                            <section>
                                <h2 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                                    <Icon name="lightbulb" size="sm" className="text-blue-500" />
                                    Gợi ý theo cấp độ
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {suggestions.map((v) => (
                                        <button
                                            key={v.id}
                                            onClick={() => onPick(v.simplified)}
                                            className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-left"
                                        >
                                            <div className="text-3xl font-bold text-[var(--text-main)] hanzi text-center mb-1">{v.simplified}</div>
                                            <div className="text-xs text-[var(--text-secondary)] text-center pinyin truncate">{v.pinyin}</div>
                                            <div className="text-[10px] text-[var(--text-muted)] text-center mt-1 truncate">{v.meaningVi}</div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {due.length === 0 && (
                            <p className="text-center text-xs text-[var(--text-muted)] italic">
                                Bạn chưa luyện chữ nào — chọn một từ ở trên để bắt đầu.
                            </p>
                        )}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}

/* ========================================================================
   Session — actual practice for the chosen word
   ======================================================================== */

function WritingSession({ word, onExit }: { word: string; onExit: () => void }) {
    const [payload, setPayload] = useState<WritingWordResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [charIndex, setCharIndex] = useState(0);
    const [currentStage, setCurrentStage] = useState<WritingStage>(1);
    const [feedback, setFeedback] = useState<WritingSubmitResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [sessionXp, setSessionXp] = useState(0);
    const [finished, setFinished] = useState(false);
    const [strokeWriterKey, setStrokeWriterKey] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchWritingWord(word);
            setPayload(data);
            if (data.characters[0]) setCurrentStage(data.characters[0].currentStage);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [word]);

    useEffect(() => { load(); }, [load]);

    const currentChar = payload?.characters[charIndex];

    const advanceCharOrFinish = useCallback(() => {
        if (!payload) return;
        const next = charIndex + 1;
        if (next >= payload.characters.length) {
            setFinished(true);
            playSfx('complete');
            return;
        }
        setCharIndex(next);
        setCurrentStage(payload.characters[next].currentStage);
        setFeedback(null);
        setStrokeWriterKey(k => k + 1);
    }, [charIndex, payload]);

    const handleComplete = useCallback(async ({ totalMistakes, strokeCount }: { totalMistakes: number; strokeCount: number }) => {
        if (!currentChar || submitting) return;
        setSubmitting(true);
        try {
            const result = await submitWritingAttempt({
                character: currentChar.hanzi,
                stage: currentStage,
                mistakes: totalMistakes,
                strokeCount: strokeCount || currentChar.strokeCount || 1,
            });
            setFeedback(result);
            setSessionXp(prev => prev + (result.xpEarned || 0));
            playSfx(result.scoreLabel === 'fail' ? 'wrong' : 'correct');
        } catch (e) {
            console.error('submit error:', e);
            setError(e instanceof Error ? e.message : 'Không gửi được kết quả');
        } finally {
            setSubmitting(false);
        }
    }, [currentChar, currentStage, submitting]);

    const handleNext = () => {
        if (!feedback) return;
        const advanced = feedback.scoreLabel !== 'fail' && feedback.currentStage > currentStage;
        const charDone = feedback.scoreLabel !== 'fail' && currentStage === 3;

        if (charDone || feedback.graduated) {
            advanceCharOrFinish();
            return;
        }
        if (advanced) {
            setCurrentStage(feedback.currentStage);
        }
        // else: stage giữ nguyên (fail) — user retry cùng stage
        setFeedback(null);
        setStrokeWriterKey(k => k + 1);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)]"><Header />
                <div className="max-w-3xl mx-auto py-12 text-center text-[var(--text-muted)]">Đang tải...</div>
            </div>
        );
    }
    if (error || !payload || !currentChar) {
        return (
            <div className="min-h-screen bg-[var(--background)]"><Header />
                <div className="max-w-3xl mx-auto py-16 text-center">
                    <p className="text-[var(--text-muted)] mb-4">{error || 'Không tìm thấy dữ liệu'}</p>
                    <button onClick={onExit} className="btn-primary">Quay lại</button>
                </div>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--background)]"><Header />
                <main className="flex-1 max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
                    <Icon name="celebration" size="xl" className="text-amber-500 inline-block" />
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">Hoàn thành!</h1>
                    <p className="text-[var(--text-muted)]">
                        Bạn đã luyện đủ {payload.characters.length} chữ trong từ <span className="hanzi text-2xl text-[var(--text-main)]">{word}</span>
                    </p>
                    {sessionXp > 0 && (
                        <p className="text-yellow-500 font-semibold inline-flex items-center gap-1">
                            <Icon name="bolt" size="sm" /> +{sessionXp} XP
                        </p>
                    )}
                    <div className="flex justify-center gap-3 mt-6">
                        <button onClick={onExit} className="btn-secondary">Chọn từ khác</button>
                        <button
                            onClick={() => {
                                setCharIndex(0);
                                setCurrentStage(payload.characters[0].currentStage);
                                setFinished(false);
                                setFeedback(null);
                                setStrokeWriterKey(k => k + 1);
                            }}
                            className="btn-primary"
                        >
                            Luyện lại từ đầu
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]"><Header />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
                {/* Word meta */}
                <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="hanzi text-4xl font-bold text-[var(--text-main)]">{word}</div>
                            {payload.wordMeta?.pinyin && (
                                <div className="pinyin text-base text-[var(--text-secondary)] mt-1">{payload.wordMeta.pinyin}</div>
                            )}
                            {payload.wordMeta?.meaningVi && (
                                <div className="text-sm text-[var(--text-muted)] mt-1">{payload.wordMeta.meaningVi}</div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {payload.wordMeta && (
                                <button
                                    onClick={() => playAudio(payload.wordMeta!.simplified, payload.wordMeta!.audioUrl || undefined)}
                                    className="btn-audio"
                                    title="Nghe phát âm"
                                    aria-label="Nghe phát âm"
                                >
                                    <Icon name="volume_up" size="md" />
                                </button>
                            )}
                            <button onClick={onExit} className="text-xs text-[var(--text-muted)] hover:underline">Thoát</button>
                        </div>
                    </div>

                    {/* Character progress strip */}
                    <div className="flex items-center gap-2 mt-4">
                        {payload.characters.map((c, i) => (
                            <div
                                key={i}
                                className={`flex-1 min-w-0 p-2 rounded-lg border text-center ${
                                    i === charIndex
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                        : i < charIndex
                                            ? 'border-emerald-500 bg-emerald-500/5'
                                            : 'border-[var(--border)] bg-[var(--surface-secondary)] opacity-50'
                                }`}
                            >
                                <div className="hanzi text-2xl">{c.hanzi}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">
                                    {i < charIndex ? 'Xong' : i === charIndex ? `Stage ${currentStage}/3` : `Stage ${c.currentStage}/3`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stage indicator */}
                <div className="text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">
                        {STAGE_LABELS[currentStage]}
                    </span>
                </div>

                {/* Stroke writer */}
                <div className="flex justify-center">
                    <StrokeWriter
                        key={strokeWriterKey}
                        character={currentChar.hanzi}
                        stage={currentStage}
                        demoOnStart={currentStage === 1}
                        size={300}
                        hideControls={true}
                        onComplete={handleComplete}
                    />
                </div>

                {/* Feedback panel */}
                {feedback && (
                    <div className={`p-4 rounded-2xl border-2 ${
                        feedback.scoreLabel === 'perfect'
                            ? 'border-emerald-500 bg-emerald-500/5'
                            : feedback.scoreLabel === 'pass'
                                ? 'border-blue-500 bg-blue-500/5'
                                : 'border-red-500 bg-red-500/5'
                    }`}>
                        <div className="flex items-center gap-3 mb-2">
                            <Icon
                                name={feedback.scoreLabel === 'fail' ? 'cancel' : 'check_circle'}
                                size="md"
                                className={feedback.scoreLabel === 'perfect' ? 'text-emerald-500'
                                    : feedback.scoreLabel === 'pass' ? 'text-blue-500' : 'text-red-500'}
                            />
                            <h3 className="font-semibold text-[var(--text-main)]">
                                {feedback.scoreLabel === 'perfect' ? 'Hoàn hảo!'
                                    : feedback.scoreLabel === 'pass' ? 'Tốt — qua được rồi'
                                        : 'Chưa đạt — thử lại nhé'}
                            </h3>
                            {feedback.xpEarned > 0 && (
                                <span className="ml-auto text-xs text-yellow-500 font-semibold inline-flex items-center gap-1">
                                    <Icon name="bolt" size="xs" /> +{feedback.xpEarned} XP
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {feedback.graduated
                                ? `Chữ ${currentChar.hanzi} đã thuộc — sẽ ôn lại sau ${feedback.intervalDays} ngày.`
                                : feedback.scoreLabel === 'fail'
                                    ? 'Hãy thử lại cùng stage này.'
                                    : feedback.currentStage > currentStage && feedback.currentStage <= 3
                                        ? `Lên stage ${feedback.currentStage}/3 — chuẩn bị nhé!`
                                        : ''}
                        </p>
                        <button
                            onClick={handleNext}
                            disabled={submitting}
                            className="mt-3 w-full py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60"
                        >
                            {feedback.graduated || (feedback.scoreLabel !== 'fail' && currentStage === 3)
                                ? (charIndex + 1 < payload.characters.length ? 'Chữ tiếp theo' : 'Hoàn thành')
                                : feedback.scoreLabel === 'fail' ? 'Thử lại' : 'Tiếp tục'}
                        </button>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
