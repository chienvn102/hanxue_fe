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
    maxPlays?: number;
}

/**
 * AudioPlayer — inline mini player listening.
 * - mode='practice': replay unlimited, seekable, reset khi hết.
 * - mode='full': auto-play, seek locked, KHÔNG reset, để cho FE tracking offset.
 */
export function AudioPlayer({ src, label, onPlay, onTime, onEnded, mode = 'practice', autoPlay = false, maxPlays }: Props) {
    const ref = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0-1
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playsUsed, setPlaysUsed] = useState(0);
    const [activePlayCounted, setActivePlayCounted] = useState(false);
    const activePlayCountedRef = useRef(false);
    const locked = mode === 'full';
    const playLimit = typeof maxPlays === 'number' && maxPlays > 0 ? maxPlays : null;
    const limitReached = playLimit !== null && playsUsed >= playLimit && !activePlayCounted;
    const seekLocked = locked || playLimit !== null;

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
            if (limitReached) return;
            el.play().catch(() => setPlaying(false));
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

    const handlePlay = () => {
        setPlaying(true);
        if (!activePlayCountedRef.current) {
            activePlayCountedRef.current = true;
            setActivePlayCounted(true);
            if (playLimit !== null) {
                setPlaysUsed(prev => Math.min(prev + 1, playLimit));
            }
        }
        onPlay?.();
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
        setActivePlayCounted(false);
        activePlayCountedRef.current = false;
        if (!locked) {
            setProgress(0);
            setCurrentTime(0);
        } else {
            setProgress(1);
        }
        onEnded?.();
    };

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (seekLocked) return;
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
                disabled={limitReached}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-opacity flex-shrink-0 ${
                    limitReached
                        ? 'bg-[var(--surface-secondary)] text-[var(--text-muted)] cursor-not-allowed'
                        : 'bg-[var(--primary)] text-white hover:opacity-90'
                }`}
                aria-label={limitReached ? 'Đã hết lượt nghe' : playing ? 'Tạm dừng' : 'Phát audio'}
                type="button"
            >
                <Icon name={limitReached ? 'block' : playing ? 'pause' : 'play_arrow'} size="sm" />
            </button>
            <div
                onClick={seek}
                className={`flex-1 h-1.5 bg-[var(--surface-secondary)] rounded-full overflow-hidden ${seekLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                title={seekLocked ? 'Không tua được audio giới hạn lượt nghe' : undefined}
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
            {playLimit !== null && (
                <span className={`text-xs shrink-0 ${limitReached ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                    {limitReached ? 'Hết lượt nghe' : `Còn ${Math.max(playLimit - playsUsed, 0)}/${playLimit} lượt`}
                </span>
            )}
            <audio
                ref={ref}
                src={getMediaUrl(src)}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={handleEnded}
                onPause={() => setPlaying(false)}
                onPlay={handlePlay}
            />
        </div>
    );
}
