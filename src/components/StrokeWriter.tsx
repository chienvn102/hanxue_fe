'use client';

import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';

interface StrokeWriterProps {
    character: string;
    size?: number;
    strokeColor?: string;
    className?: string;
}

export default function StrokeWriter({
    character,
    size = 150,
    strokeColor = '#1a365d',
    className = '',
}: StrokeWriterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const writerRef = useRef<HanziWriter | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initialize HanziWriter
    useEffect(() => {
        if (!containerRef.current || !character) return;

        const container = containerRef.current;
        container.innerHTML = '';
        writerRef.current = null;
        setIsReady(false);

        try {
            const writer = HanziWriter.create(container, character, {
                width: size,
                height: size,
                padding: 5,
                showOutline: true,
                strokeColor: strokeColor,
                outlineColor: '#ddd',
                radicalColor: '#dc2626',
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 200,
                showCharacter: true,
                onLoadCharDataSuccess: () => {
                    setIsReady(true);
                },
                onLoadCharDataError: () => {
                    console.error('Failed to load character data for:', character);
                }
            });

            writerRef.current = writer;
        } catch (err) {
            console.error('HanziWriter create error:', err);
        }

        return () => {
            container.innerHTML = '';
            writerRef.current = null;
        };
    }, [character, size, strokeColor]);

    const handlePlay = () => {
        const writer = writerRef.current;
        if (!writer || isAnimating) return;

        setIsAnimating(true);

        writer.hideCharacter();
        writer.showOutline();

        writer.animateCharacter({
            onComplete: () => {
                setIsAnimating(false);
                writer.showCharacter();
            }
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
            {/* Canvas */}
            <div
                className="relative bg-white rounded-lg overflow-hidden"
                style={{ width: size, height: size, border: '2px solid #d1d5db' }}
            >
                {/* Grid lines */}
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

                {/* HanziWriter container */}
                <div
                    ref={containerRef}
                    className="absolute inset-0"
                    style={{ zIndex: 1 }}
                />
            </div>

            {/* Play button */}
            <div className="flex justify-center mt-2">
                <button
                    type="button"
                    onClick={handlePlay}
                    disabled={!isReady || isAnimating}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                    {isAnimating ? '⏸ Đang vẽ...' : '▶ Phát'}
                </button>
            </div>
        </div>
    );
}
