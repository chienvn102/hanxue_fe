'use client';

import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';

export type StrokeWriterMode = 'animate' | 'trace' | 'memorize';

/**
 * Practice stage (1–3, Duolingo-style progression).
 *   1 = Trace: outline + hint after first miss (showHintAfterMisses: 1)
 *   2 = Partial: outline + higher leniency + hint after 2 misses (fallback for
 *                pre-fill-half-strokes — HanziWriter has no native API for that)
 *   3 = Blank: no outline + (almost) no hint
 */
export type StrokeWriterStage = 1 | 2 | 3;

interface StrokeWriterProps {
    character: string;
    /** Legacy preset. New code should use `stage` instead. */
    mode?: StrokeWriterMode;
    /** When set, overrides `mode` and configures HanziWriter for that practice stage. */
    stage?: StrokeWriterStage;
    /** If true (default), animate the character once before starting the quiz (only for stage 1). */
    demoOnStart?: boolean;
    size?: number;
    strokeColor?: string;
    className?: string;
    /** Hide the bottom "Retry" / "Play" button (useful when the parent provides its own controls). */
    hideControls?: boolean;
    onComplete?: (stats: { totalMistakes: number; charactersCompleted: number; strokeCount: number }) => void;
}

/** Map stage → HanziWriter render + quiz config. */
function stageConfig(stage: StrokeWriterStage) {
    switch (stage) {
        case 1:
            return {
                showOutline: true,
                showCharacter: false,
                hintAfterMisses: 1,
                leniency: 1.0,
            };
        case 2:
            return {
                showOutline: true,
                showCharacter: false,
                hintAfterMisses: 2,
                leniency: 1.3,
            };
        case 3:
        default:
            return {
                showOutline: false,
                showCharacter: false,
                hintAfterMisses: 99,
                leniency: 1.0,
            };
    }
}

export default function StrokeWriter({
    character,
    mode = 'animate',
    stage,
    demoOnStart = true,
    size = 150,
    strokeColor = '#1a365d',
    className = '',
    hideControls = false,
    onComplete,
}: StrokeWriterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const writerRef = useRef<any>(null);
    const strokeCountRef = useRef<number>(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [quizRunning, setQuizRunning] = useState(false);

    // If stage is set it overrides legacy mode. Otherwise compute config from mode.
    const cfg = stage !== undefined
        ? stageConfig(stage)
        : {
            showOutline: mode !== 'memorize',
            showCharacter: mode === 'animate',
            hintAfterMisses: mode === 'trace' ? 1 : 5,
            leniency: 1.0,
        };

    useEffect(() => {
        if (!containerRef.current || !character) return;

        const container = containerRef.current;
        container.innerHTML = '';
        writerRef.current = null;
        setIsReady(false);
        setQuizRunning(false);

        try {
            const writer = HanziWriter.create(container, character, {
                width: size,
                height: size,
                padding: 5,
                showOutline: cfg.showOutline,
                showCharacter: cfg.showCharacter,
                strokeColor,
                outlineColor: '#ddd',
                radicalColor: '#dc2626',
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 150,
                onLoadCharDataSuccess: (data: { strokes?: unknown[] }) => {
                    strokeCountRef.current = Array.isArray(data?.strokes) ? data.strokes.length : 0;
                    setIsReady(true);
                },
                onLoadCharDataError: () => {
                    console.error('Failed to load character data for:', character);
                },
            });
            writerRef.current = writer;
        } catch (err) {
            console.error('HanziWriter create error:', err);
        }

        return () => {
            container.innerHTML = '';
            writerRef.current = null;
        };
    }, [character, size, strokeColor, mode]);

    const startQuiz = () => {
        const writer = writerRef.current;
        if (!writer || !isReady) return;

        writer.cancelQuiz?.();
        writer.hideCharacter();
        if (cfg.showOutline) writer.showOutline?.();
        else writer.hideOutline?.();
        setQuizRunning(true);

        writer.quiz({
            showHintAfterMisses: cfg.hintAfterMisses,
            leniency: cfg.leniency,
            highlightOnComplete: true,
            onComplete: (summary: { totalMistakes?: number }) => {
                setQuizRunning(false);
                onComplete?.({
                    totalMistakes: summary.totalMistakes || 0,
                    charactersCompleted: 1,
                    strokeCount: strokeCountRef.current,
                });
            },
        });
    };

    const runDemoThenQuiz = () => {
        const writer = writerRef.current;
        if (!writer || !isReady) return;
        setIsAnimating(true);
        writer.cancelQuiz?.();
        writer.hideCharacter();
        if (cfg.showOutline) writer.showOutline?.();
        writer.animateCharacter({
            onComplete: () => {
                setIsAnimating(false);
                writer.hideCharacter();
                startQuiz();
            },
        });
    };

    useEffect(() => {
        if (!isReady) return;
        // Stage-driven init:
        //   - stage 1 + demoOnStart → animate once, then auto-enter quiz
        //   - stage 1 (no demo) / stage 2 / stage 3 → enter quiz immediately
        //   - legacy modes 'trace' / 'memorize' → quiz immediately
        //   - legacy 'animate' → idle, user clicks Play button manually
        if (stage !== undefined) {
            if (stage === 1 && demoOnStart) runDemoThenQuiz();
            else startQuiz();
            return;
        }
        if (mode !== 'animate') startQuiz();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, mode, stage, character]);

    const handlePlay = () => {
        const writer = writerRef.current;
        if (!writer || isAnimating) return;

        setIsAnimating(true);
        writer.cancelQuiz?.();
        writer.hideCharacter();
        writer.showOutline();
        writer.animateCharacter({
            onComplete: () => {
                setIsAnimating(false);
                writer.showCharacter();
            },
        });
    };

    if (!character) {
        return (
            <div className={`stroke-writer ${className}`}>
                <div
                    className="flex items-center justify-center bg-white rounded-lg"
                    style={{ width: size, height: size, border: '2px solid #d1d5db' }}
                >
                    <span className="text-gray-400 text-xs">--</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`stroke-writer ${className}`}>
            <div
                className="relative bg-white rounded-lg overflow-hidden"
                style={{ width: size, height: size, border: '2px solid #d1d5db' }}
            >
                <svg
                    className="absolute inset-0 pointer-events-none"
                    width={size}
                    height={size}
                    style={{ zIndex: 0 }}
                >
                    <line x1="0" y1={size / 2} x2={size} y2={size / 2} stroke="#e5e7eb" strokeWidth="1" />
                    <line x1={size / 2} y1="0" x2={size / 2} y2={size} stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="0" y1="0" x2={size} y2={size} stroke="#f3f4f6" strokeWidth="1" />
                    <line x1={size} y1="0" x2="0" y2={size} stroke="#f3f4f6" strokeWidth="1" />
                </svg>
                <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />
            </div>

            {!hideControls && (
                <div className="flex justify-center gap-2 mt-2">
                    {mode === 'animate' && stage === undefined ? (
                        <button
                            type="button"
                            onClick={handlePlay}
                            disabled={!isReady || isAnimating}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {isAnimating ? 'Đang vẽ...' : 'Phát'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={startQuiz}
                            disabled={!isReady || quizRunning || isAnimating}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {isAnimating ? 'Đang vẽ mẫu...' : quizRunning ? 'Đang luyện...' : 'Làm lại'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
