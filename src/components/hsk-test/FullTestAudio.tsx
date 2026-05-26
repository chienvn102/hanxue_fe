'use client';

import { useState } from 'react';
import { AudioPlayer } from './AudioPlayer';

interface Props {
    audioUrl: string;
    sectionTitle?: string;
}

/**
 * FullTestAudio — section-level audio liên tục cho chế độ Thi.
 *
 * - Auto-play 1 lần.
 * - Seek locked.
 * - Không track per-question — chỉ là 1 file audio liên tục từ đầu đến cuối,
 *   user nghe + tự note đáp án theo thứ tự câu.
 *
 * (Trước migration 022, component này còn marker "Đang ở câu X" dựa vào
 * audio_start_time/audio_end_time. Đã bỏ — exam mode giờ không cần timestamp.)
 */
export function FullTestAudio({ audioUrl, sectionTitle }: Props) {
    const [ended, setEnded] = useState(false);

    return (
        <div className="sticky top-[57px] z-20 bg-amber-500/10 border-b-2 border-amber-500/30 px-4 py-3">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            ⚠ Chế độ thi — audio chỉ phát 1 lần, không tua
                        </p>
                        {sectionTitle && (
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 truncate">{sectionTitle}</p>
                        )}
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-mono shrink-0 tabular-nums">
                        {ended ? <span>✓ Đã hết audio</span> : <span>Đang phát...</span>}
                    </div>
                </div>
                <AudioPlayer
                    key={audioUrl}
                    src={audioUrl}
                    mode="full"
                    autoPlay
                    maxPlays={1}
                    onEnded={() => setEnded(true)}
                />
            </div>
        </div>
    );
}
