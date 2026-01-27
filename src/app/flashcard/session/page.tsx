'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { submitReview } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://167.172.69.210/hanxue';

interface Flashcard {
    id: number;
    simplified: string;
    traditional: string;
    pinyin: string;
    hanViet: string;
    meaningVi: string;
    meaningEn: string;
    hskLevel: number;
}

interface Choice {
    id: number;
    meaningVi: string;
}

function FlashcardSessionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const hsk = searchParams.get('hsk') || '1';
    const limit = searchParams.get('limit') || '20';
    const mode = searchParams.get('mode') || 'choice';

    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [queue, setQueue] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Quiz state
    const [choices, setChoices] = useState<Choice[]>([]);
    const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    // Progress
    const [correctCount, setCorrectCount] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [wrongCards, setWrongCards] = useState<Set<number>>(new Set());

    // Hint state for listen mode
    const [showHint, setShowHint] = useState(false);

    // Load flashcards
    useEffect(() => {
        const loadFlashcards = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/flashcard?hsk=${hsk}&limit=${limit}`);
                const data = await res.json();

                if (data.flashcards && data.flashcards.length > 0) {
                    setFlashcards(data.flashcards);
                    setQueue(data.flashcards.map((_: Flashcard, i: number) => i));
                } else {
                    setError('Không tìm thấy từ vựng');
                }
            } catch (err) {
                setError('Không thể tải flashcard');
            } finally {
                setLoading(false);
            }
        };

        loadFlashcards();
    }, [hsk, limit]);

    // Load choices for current card
    const loadChoices = useCallback(async (card: Flashcard) => {
        if (mode !== 'choice') return;

        try {
            const res = await fetch(`${API_BASE}/api/flashcard/choices?exclude=${card.id}&count=3&hsk=${hsk}`);
            const data = await res.json();

            const allChoices = [
                { id: card.id, meaningVi: card.meaningVi },
                ...data.choices
            ];

            // Shuffle
            for (let i = allChoices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
            }

            setChoices(allChoices);
        } catch (err) {
            console.error('Failed to load choices:', err);
        }
    }, [mode, hsk]);

    useEffect(() => {
        if (flashcards.length > 0 && queue.length > 0) {
            const currentCard = flashcards[queue[currentIndex]];
            if (currentCard) {
                loadChoices(currentCard);
                setSelectedChoice(null);
                setUserAnswer('');
                setShowResult(false);
                setShowHint(false); // Reset hint when moving to new card
            }
        }
    }, [currentIndex, flashcards, queue, loadChoices]);

    const currentCard = flashcards[queue[currentIndex]];
    const progress = flashcards.length > 0
        ? Math.round((correctCount / flashcards.length) * 100)
        : 0;
    const remaining = flashcards.length - correctCount;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    // Check answer
    const checkAnswer = async () => {
        if (!currentCard) return;

        let correct = false;

        if (mode === 'choice') {
            correct = selectedChoice === currentCard.id;
        } else if (mode === 'listen') {
            // Listen mode: compare Chinese characters
            const userAns = userAnswer.trim();
            correct = userAns === currentCard.simplified || userAns === currentCard.traditional;
        } else {
            // Write mode: compare Vietnamese meaning
            const userAns = userAnswer.trim().toLowerCase();
            const correctAns = currentCard.meaningVi.toLowerCase();

            const meaningWords = correctAns
                .split(/[;,\/\|\(\)\[\]:]+/)
                .map(w => w.trim())
                .filter(w => w.length >= 2);

            correct = meaningWords.some(meaning => {
                const meaningCore = meaning.replace(/\s+/g, ' ').trim();
                const userCore = userAns.replace(/\s+/g, ' ').trim();

                if (userCore.length < 2) return false;
                if (meaningCore === userCore) return true;
                if (userCore.includes(meaningCore) && meaningCore.length >= 3) return true;
                if (meaningCore.includes(userCore) && userCore.length >= meaningCore.length * 0.7) return true;

                return false;
            });
        }

        setIsCorrect(correct);
        setShowResult(true);
        setTotalAttempts(prev => prev + 1);

        if (correct) {
            setCorrectCount(prev => prev + 1);
        } else {
            setWrongCards(prev => new Set([...prev, queue[currentIndex]]));
        }

        // Submit review to backend (updates SRS & Streak)
        try {
            // Quality 5 for correct, 0 for wrong
            // In a real app we might want to measure time taken
            await submitReview(currentCard.id, correct ? 5 : 0);
        } catch (err) {
            console.error('Failed to submit review:', err);
        }
    };

    const nextCard = () => {
        const nextIdx = currentIndex + 1;

        if (nextIdx >= queue.length) {
            if (wrongCards.size > 0) {
                const wrongIndices = Array.from(wrongCards);
                setQueue([...wrongIndices]);
                setWrongCards(new Set());
                setCurrentIndex(0);
            } else {
                setCompleted(true);
            }
        } else {
            setCurrentIndex(nextIdx);
        }

        setShowResult(false);
        setSelectedChoice(null);
        setUserAnswer('');
    };

    const restart = () => router.push('/flashcard');

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)]">Đang tải flashcard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="text-center">
                    <Icon name="sentiment_dissatisfied" size="xl" className="text-[var(--primary)] mb-4" />
                    <p className="text-xl text-[var(--primary)] mb-4">{error}</p>
                    <Link href="/flashcard">
                        <Button variant="secondary">
                            <Icon name="arrow_back" size="sm" />
                            Quay lại
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="min-h-screen bg-[var(--background)]">
                <Header />
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <Card hover={false} padding="lg" className="text-center">
                        <Icon name="celebration" size="xl" className="text-[var(--primary)] mb-4" />
                        <h1 className="text-3xl font-bold mb-2 text-[var(--text-main)]">Hoàn thành!</h1>
                        <p className="text-[var(--text-secondary)] mb-8">Bạn đã làm rất tốt! Điểm kinh nghiệm +{correctCount * 5} XP</p>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
                                <div className="text-4xl font-bold text-emerald-500">{accuracy}%</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-1">Độ chính xác</div>
                            </div>
                            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl p-6">
                                <div className="text-4xl font-bold text-[var(--primary)]">{correctCount}</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-1">Từ đã học</div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <Button onClick={restart} variant="secondary">
                                <Icon name="refresh" size="sm" />
                                Luyện tập lại
                            </Button>
                            <Link href="/vocab">
                                <Button>
                                    Học tiếp
                                    <Icon name="arrow_forward" size="sm" />
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Header />

            <div className="max-w-[1280px] mx-auto p-4 md:p-6 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Main Content */}
                <main className="flex-1 flex flex-col gap-6 max-w-3xl mx-auto w-full">
                    {/* Progress Bar */}
                    <div className="flex flex-col gap-2 w-full">
                        <div className="flex justify-between items-end">
                            <p className="text-[var(--text-secondary)] text-sm font-medium">
                                HSK Level {hsk} • {mode === 'choice' ? 'Trắc nghiệm' : mode === 'listen' ? 'Nghe viết' : 'Tự luận'}
                            </p>
                            <p className="text-[var(--text-main)] text-sm font-bold">{progress}%</p>
                        </div>
                        <div className="h-3 w-full rounded-full bg-[var(--border)] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-red-400 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Flashcard */}
                    {currentCard && (
                        <>
                            <Card hover={false} padding="none" className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] flex flex-col items-center justify-center p-8">
                                {/* Audio button - prominent in listen mode */}
                                <button
                                    onClick={() => {
                                        const audioUrl = `${API_BASE}/audio/cmn-${encodeURIComponent(currentCard.simplified)}.mp3`;
                                        const audio = new Audio(audioUrl);
                                        audio.play();
                                    }}
                                    className={`${mode === 'listen' ? 'w-24 h-24 text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20' : 'absolute top-4 right-4 w-12 h-12 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-secondary)]'} p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center`}
                                >
                                    <Icon name="volume_up" size={mode === 'listen' ? 'xl' : 'lg'} />
                                </button>

                                {/* Character Display - hidden in listen mode until answer shown */}
                                {mode === 'listen' ? (
                                    <div className="flex flex-col items-center gap-4 text-center z-10 mt-6">
                                        {showResult ? (
                                            <>
                                                <h1 className="hanzi text-7xl md:text-8xl font-normal text-[var(--text-main)] tracking-wide">
                                                    {currentCard.simplified}
                                                </h1>
                                                <div className="flex flex-col gap-1 items-center">
                                                    <p className="text-xl text-[var(--primary)] font-medium">{currentCard.pinyin}</p>
                                                    <p className="text-sm text-[var(--text-secondary)]">{currentCard.meaningVi}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-lg text-[var(--text-secondary)]">Nhấn nút để nghe và viết chữ Hán</p>
                                                {/* Hint Button */}
                                                {!showHint ? (
                                                    <button
                                                        onClick={() => setShowHint(true)}
                                                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                                                    >
                                                        <Icon name="lightbulb" size="sm" />
                                                        <span>Gợi ý</span>
                                                    </button>
                                                ) : (
                                                    <div className="mt-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                                        <p className="text-sm text-amber-400 mb-1">💡 Nghĩa:</p>
                                                        <p className="text-lg text-[var(--text-main)] font-medium">{currentCard.meaningVi}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-center z-10">
                                        <h1 className="hanzi text-7xl md:text-8xl lg:text-9xl font-normal text-[var(--text-main)] tracking-wide">
                                            {currentCard.simplified}
                                        </h1>
                                        <div className="flex flex-col gap-1 items-center">
                                            <p className="text-2xl text-[var(--primary)] font-medium">{currentCard.pinyin}</p>
                                            {currentCard.hanViet && (
                                                <p className="text-sm text-[var(--text-secondary)] italic">{currentCard.hanViet}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Answer Section */}
                            {mode === 'choice' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    {choices.map((choice, idx) => {
                                        const letter = ['A', 'B', 'C', 'D'][idx];
                                        const isSelected = selectedChoice === choice.id;
                                        const isCorrectChoice = choice.id === currentCard.id;

                                        let btnClass = 'relative flex items-center p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer ';

                                        if (showResult) {
                                            if (isCorrectChoice) {
                                                btnClass += 'border-emerald-500/50 bg-emerald-500/10';
                                            } else if (isSelected && !isCorrectChoice) {
                                                btnClass += 'border-red-500/50 bg-red-500/10';
                                            } else {
                                                btnClass += 'border-[var(--border)] bg-[var(--surface)] opacity-50';
                                            }
                                        } else {
                                            btnClass += isSelected
                                                ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50';
                                        }

                                        return (
                                            <button
                                                key={choice.id}
                                                onClick={() => !showResult && setSelectedChoice(choice.id)}
                                                disabled={showResult}
                                                className={btnClass}
                                            >
                                                <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center mr-4 transition-colors
                                                    ${showResult && isCorrectChoice
                                                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                                        : showResult && isSelected && !isCorrectChoice
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            : isSelected
                                                                ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                                                                : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                                                    }`}>
                                                    {letter}
                                                </div>
                                                <span className={`font-medium text-lg ${showResult && isCorrectChoice ? 'text-emerald-500' : 'text-[var(--text-main)]'}`}>
                                                    {choice.meaningVi}
                                                </span>
                                                {showResult && isCorrectChoice && (
                                                    <div className="absolute right-4 text-emerald-500">
                                                        <Icon name="check_circle" filled />
                                                    </div>
                                                )}
                                                {showResult && isSelected && !isCorrectChoice && (
                                                    <div className="absolute right-4 text-red-400">
                                                        <Icon name="cancel" filled />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : mode === 'listen' ? (
                                /* Listen Mode - Write Chinese */
                                <div className="mt-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={userAnswer}
                                            onChange={(e) => setUserAnswer(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && !showResult && userAnswer.trim() && checkAnswer()}
                                            placeholder="Viết chữ Hán..."
                                            disabled={showResult}
                                            className={`input pr-24 text-2xl text-center hanzi
                                                ${showResult
                                                    ? isCorrect ? 'border-emerald-500' : 'border-red-500'
                                                    : ''
                                                }`}
                                            lang="zh-CN"
                                        />
                                        {!showResult && (
                                            <Button
                                                onClick={checkAnswer}
                                                disabled={!userAnswer.trim()}
                                                size="sm"
                                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                            >
                                                Kiểm tra
                                                <Icon name="arrow_forward" size="sm" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Write Mode - Vietnamese meaning */
                                <div className="mt-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={userAnswer}
                                            onChange={(e) => setUserAnswer(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && !showResult && userAnswer.trim() && checkAnswer()}
                                            placeholder="Nhập nghĩa tiếng Việt..."
                                            disabled={showResult}
                                            className={`input pr-24 text-lg
                                                ${showResult
                                                    ? isCorrect ? 'border-emerald-500' : 'border-red-500'
                                                    : ''
                                                }`}
                                        />
                                        {!showResult && (
                                            <Button
                                                onClick={checkAnswer}
                                                disabled={!userAnswer.trim()}
                                                size="sm"
                                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                            >
                                                Kiểm tra
                                                <Icon name="arrow_forward" size="sm" />
                                            </Button>
                                        )}
                                    </div>
                                    {showResult && (
                                        <div className={`mt-3 p-3 rounded-lg ${isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                                            <span className="font-semibold">Đáp án: </span>
                                            {currentCard.meaningVi}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Feedback & Next Button - Mobile only */}
                            {showResult && (
                                <div className="lg:hidden">
                                    <div className="flex items-center gap-2 justify-center pt-2">
                                        <span className={`text-sm font-bold tracking-wide uppercase flex items-center gap-2 ${isCorrect ? 'text-emerald-500' : 'text-red-400'}`}>
                                            <Icon name={isCorrect ? 'check_circle' : 'info'} size="sm" />
                                            {isCorrect ? 'Chính xác!' : 'Chưa đúng - Từ này sẽ được lặp lại'}
                                        </span>
                                    </div>
                                    <div className="flex justify-center mt-2">
                                        <Button onClick={nextCard}>
                                            <span>{isCorrect ? 'Từ tiếp theo' : 'Tiếp tục'}</span>
                                            <Icon name="arrow_forward" size="sm" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Check Button (only for choice mode when not showing result) */}
                            {mode === 'choice' && !showResult && (
                                <div className="flex justify-center mt-2">
                                    <Button onClick={checkAnswer} disabled={selectedChoice === null}>
                                        Kiểm tra
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </main>

                {/* Sidebar */}
                <aside className="w-full lg:w-72 flex flex-col gap-6 shrink-0">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card hover={false} padding="sm" className="flex flex-col gap-1 items-center justify-center">
                            <span className="text-emerald-500 font-bold text-xl">{accuracy}%</span>
                            <span className="text-[var(--text-secondary)] text-xs">Chính xác</span>
                        </Card>
                        <Card hover={false} padding="sm" className="flex flex-col gap-1 items-center justify-center">
                            <span className="text-[var(--primary)] font-bold text-xl">{remaining}</span>
                            <span className="text-[var(--text-secondary)] text-xs">Còn lại</span>
                        </Card>
                    </div>

                    {/* Feedback & Next Button - Desktop only */}
                    {showResult && (
                        <Card hover={false} padding="md" className="hidden lg:flex flex-col gap-4">
                            <div className="flex items-center gap-2 justify-center">
                                <span className={`text-sm font-bold tracking-wide uppercase flex items-center gap-2 ${isCorrect ? 'text-emerald-500' : 'text-red-400'}`}>
                                    <Icon name={isCorrect ? 'check_circle' : 'info'} size="sm" />
                                    {isCorrect ? 'Chính xác!' : 'Chưa đúng'}
                                </span>
                            </div>
                            {!isCorrect && (
                                <p className="text-xs text-center text-[var(--text-secondary)]">
                                    Từ này sẽ được lặp lại
                                </p>
                            )}
                            <Button onClick={nextCard} fullWidth>
                                <span>{isCorrect ? 'Từ tiếp theo' : 'Tiếp tục'}</span>
                                <Icon name="arrow_forward" size="sm" />
                            </Button>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-auto flex flex-col gap-3">
                        <Link href="/flashcard">
                            <Button variant="secondary" fullWidth>
                                <Icon name="arrow_back" size="sm" />
                                Thoát phiên học
                            </Button>
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default function FlashcardSessionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full"></div>
            </div>
        }>
            <FlashcardSessionContent />
        </Suspense>
    );
}
