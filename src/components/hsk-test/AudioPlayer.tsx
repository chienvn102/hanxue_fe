'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getMediaUrl } from '@/lib/api';

// Volume persists across question remounts (player có key={question.id} nên remount mỗi câu).
const VOLUME_STORAGE_KEY = 'hsk_audio_volume';
const MUTED_STORAGE_KEY = 'hsk_audio_muted';

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
    const [volume, setVolume] = useState(1); // 0-1
    const [muted, setMuted] = useState(false);
    const [showVolume, setShowVolume] = useState(false);
    const volumeBoxRef = useRef<HTMLDivElement>(null);
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

    // Đọc volume/muted đã lưu khi mount (player remount mỗi câu → giữ nguyên lựa chọn).
    useEffect(() => {
        try {
            const savedVol = localStorage.getItem(VOLUME_STORAGE_KEY);
            const savedMuted = localStorage.getItem(MUTED_STORAGE_KEY);
            if (savedVol !== null) {
                const v = parseFloat(savedVol);
                if (isFinite(v)) setVolume(Math.min(1, Math.max(0, v)));
            }
            if (savedMuted === 'true') setMuted(true);
        } catch { /* localStorage unavailable */ }
    }, []);

    // Áp dụng volume/muted vào audio element (kể cả sau khi src đổi / remount).
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.volume = volume;
        el.muted = muted;
    }, [volume, muted, src]);

    // Đóng popover âm lượng khi click ra ngoài.
    useEffect(() => {
        if (!showVolume) return;
        const onDown = (e: MouseEvent) => {
            if (volumeBoxRef.current && !volumeBoxRef.current.contains(e.target as Node)) {
                setShowVolume(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [showVolume]);

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

    const changeVolume = (next: number) => {
        const v = Math.min(1, Math.max(0, next));
        setVolume(v);
        setMuted(v === 0);
        try {
            localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
            localStorage.setItem(MUTED_STORAGE_KEY, v === 0 ? 'true' : 'false');
        } catch { /* ignore */ }
    };

    const toggleMute = () => {
        setMuted(prev => {
            const next = !prev;
            try { localStorage.setItem(MUTED_STORAGE_KEY, next ? 'true' : 'false'); } catch { /* ignore */ }
            return next;
        });
    };

    const effectiveVolume = muted ? 0 : volume;
    const volumeIcon = effectiveVolume === 0 ? 'volume_off' : effectiveVolume < 0.5 ? 'volume_down' : 'volume_up';
    const volumePercent = Math.round(effectiveVolume * 100);

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
            <div ref={volumeBoxRef} className="relative shrink-0">
                <button
                    onClick={() => setShowVolume(v => !v)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
                    aria-label="Âm lượng"
                    aria-expanded={showVolume}
                    type="button"
                >
                    <Icon name={volumeIcon} size="sm" />
                </button>
                {showVolume && (
                    <div className="absolute bottom-full right-0 mb-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-lg z-10 flex items-center gap-2">
                        <button
                            onClick={toggleMute}
                            className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors shrink-0"
                            aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
                            type="button"
                        >
                            <Icon name={volumeIcon} size="sm" />
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={volumePercent}
                            onChange={(e) => changeVolume(parseInt(e.target.value, 10) / 100)}
                            className="w-28 accent-[var(--primary)] cursor-pointer"
                            aria-label="Điều chỉnh âm lượng"
                        />
                        <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums w-7 text-right shrink-0">
                            {volumePercent}
                        </span>
                    </div>
                )}
            </div>
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
