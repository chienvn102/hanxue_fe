'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { isSfxMuted, setSfxMuted, playSfx } from '@/lib/sound';

interface SfxToggleProps {
    className?: string;
}

export function SfxToggle({ className = '' }: SfxToggleProps) {
    const [muted, setMuted] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMuted(isSfxMuted());
        setMounted(true);
    }, []);

    if (!mounted) {
        // Avoid hydration mismatch: render an empty placeholder slot
        return <span className={className} aria-hidden />;
    }

    const handleToggle = () => {
        const next = !muted;
        setMuted(next);
        setSfxMuted(next);
        // Preview the sound when re-enabling, so the user gets feedback
        if (!next) playSfx('flip');
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            className={`p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors ${className}`}
            title={muted ? 'Bật âm thanh hiệu ứng' : 'Tắt âm thanh hiệu ứng'}
            aria-label={muted ? 'Bật âm thanh hiệu ứng' : 'Tắt âm thanh hiệu ứng'}
            aria-pressed={!muted}
        >
            <Icon name={muted ? 'volume_off' : 'volume_up'} size="sm" />
        </button>
    );
}
