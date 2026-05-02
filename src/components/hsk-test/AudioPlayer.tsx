'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getMediaUrl } from '@/lib/api';

interface Props {
    src: string;
    label?: string;
    /**
     * Practice mode = unlimited replay, seekable (default).
     * Full test mode = auto-play 1 lần, seek locked, không reset khi end.
     */
    onPlay?: () => void;
    onTime?: (currentTime: number, duration: number) => void;
    onEnded?: () => void;
    mode?: 'practice' | 'full';
    autoPlay?: boolean;
}

/**
 * AudioPlayer — inline mini player listening.
 * - mode='practice': replay unlimited, seekable, reset khi hết.
 * - mode='full': auto-play, seek locked, KHÔNG reset, để cho FE tracking offset.
 */
export function AudioPlayer({ src, label, onPlay, onTime, onEnded, mode = 'practice', autoPlay = false }: Props) {
    const ref = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0-1
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const locked = mode === 'full';

    useEffect(() => {
        if (!autoPlay) return;
        const el = ref.current;
        if (!el) return;
        const handler = () => {
            el.play().catch(() => { /* autoplay may be blocked, user must click */ });
        };
        if (el.readyState >= 2) handler();
        else el.addEventListener('canplay', handler, { once: true });
        return () => el.removeEventListener('canplay', handler);
    }, [autoPlay, src]);

    const toggle = () => {
        const el = ref.current;
        if (!el) return;
        if (el.paused) {
            el.play();
            setPlaying(true);
            onPlay?.();
        } else if (!locked) {
            // Full mode: pause cho phép, nhưng không seek về 0
            el.pause();
            setPlaying(false);
        } else {
            el.pause();
            setPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        const el = ref.current;
        if (!el) return;
        setProgress(el.currentTime / (el.duration || 1));
        setCurrentTime(el.currentTime);
        onTime?.(el.currentTime, el.duration || 0);
    };

    const onLoadedMetadata = () => {
        const el = ref.current;
        if (!el) return;
        setDuration(el.duration || 0);
    };

    const handleEnded = () => {
        const el = ref.current;
        if (el && !locked) el.currentTime = 0;
        setPlaying(false);
        if (!locked) {
            setProgress(0);
            setCurrentTime(0);
        } else {
            setProgress(1);
        }
        onEnded?.();
    };

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (locked) return;
        const el = ref.current;
        if (!el || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        el.currentTime = duration * ratio;
    };

    const formatTime = (s: number) => {
        if (!s || !isFinite(s)) return '00:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 py-2">
            <button
                onClick={toggle}
                className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
                aria-label={playing ? 'Pause' : 'Play'}
                type="button"
            >
                <Icon name={playing ? 'pause' : 'play_arrow'} size="sm" />
            </button>
            <div
                onClick={seek}
                className={`flex-1 h-1.5 bg-[var(--surface-secondary)] rounded-full overflow-hidden ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                title={locked ? 'Chế độ thi thật — không seek được' : undefined}
            >
                <div
                    className="h-full bg-[var(--primary)] transition-all"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {label && (
                <span className="text-xs text-[var(--text-secondary)] shrink-0">{label}</span>
            )}
            <audio
                ref={ref}
                src={getMediaUrl(src)}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={handleEnded}
                onPause={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
            />
        </div>
    );
}
