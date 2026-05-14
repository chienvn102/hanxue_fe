'use client';

import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';

export type StrokeWriterMode = 'animate' | 'trace' | 'memorize';

interface StrokeWriterProps {
    character: string;
    mode?: StrokeWriterMode;
    size?: number;
    strokeColor?: string;
    className?: string;
    onComplete?: (stats: { totalMistakes: number; charactersCompleted: number }) => void;
}

export default function StrokeWriter({
    character,
    mode = 'animate',
    size = 150,
    strokeColor = '#1a365d',
    className = '',
    onComplete,
}: StrokeWriterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const writerRef = useRef<any>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [quizRunning, setQuizRunning] = useState(false);

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
                showOutline: mode !== 'memorize',
                showCharacter: mode === 'animate',
                strokeColor,
                outlineColor: '#ddd',
                radicalColor: '#dc2626',
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 150,
                onLoadCharDataSuccess: () => setIsReady(true),
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
        if (mode === 'trace') writer.showOutline();
        if (mode === 'memorize') writer.hideOutline?.();
        setQuizRunning(true);

        writer.quiz({
            showHintAfterMisses: mode === 'trace' ? 1 : 5,
            highlightOnComplete: true,
            onComplete: (summary: { totalMistakes?: number }) => {
                setQuizRunning(false);
                onComplete?.({
                    totalMistakes: summary.totalMistakes || 0,
                    charactersCompleted: 1,
                });
            },
        });
    };

    useEffect(() => {
        if (isReady && mode !== 'animate') startQuiz();
        // startQuiz intentionally depends on current writerRef state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, mode, character]);

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

            <div className="flex justify-center gap-2 mt-2">
                {mode === 'animate' ? (
                    <button
                        type="button"
                        onClick={handlePlay}
                        disabled={!isReady || isAnimating}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {isAnimating ? 'Dang ve...' : 'Phat'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={startQuiz}
                        disabled={!isReady || quizRunning}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {quizRunning ? 'Dang luyen...' : 'Lam lai'}
                    </button>
                )}
            </div>
        </div>
    );
}
