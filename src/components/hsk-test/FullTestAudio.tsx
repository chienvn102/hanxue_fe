'use client';

import { useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import type { HskQuestion } from '@/lib/api';

interface Props {
    audioUrl: string;
    questions: HskQuestion[];
    sectionTitle?: string;
}

/**
 * FullTestAudio — section-level merged audio cho mock/official mode.
 * - Auto-play 1 lần.
 * - Seek locked.
 * - Hiển thị "Đang ở: Câu X" dựa vào audio_start_time/audio_end_time
 *   của các question trong section.
 */
export function FullTestAudio({ audioUrl, questions, sectionTitle }: Props) {
    const [currentQ, setCurrentQ] = useState<HskQuestion | null>(null);
    const [ended, setEnded] = useState(false);

    const onTime = (t: number) => {
        const found = questions.find(q => {
            const s = q.audioStartTime ?? -1;
            const e = q.audioEndTime ?? -1;
            return s >= 0 && e > s && t >= s && t < e;
        });
        if (found && found.id !== currentQ?.id) setCurrentQ(found);
    };

    return (
        <div className="sticky top-[57px] z-20 bg-amber-50 dark:bg-amber-900/20 border-b-2 border-amber-500/30 px-4 py-3">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            ⚠ Chế độ thi — audio chỉ phát 1 lần, không tua
                        </p>
                        {sectionTitle && (
                            <p className="text-xs text-amber-600 dark:text-amber-500 truncate">{sectionTitle}</p>
                        )}
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-mono shrink-0 tabular-nums">
                        {ended ? (
                            <span>✓ Đã hết audio</span>
                        ) : currentQ ? (
                            <span>Đang ở: <span className="font-bold">Câu {currentQ.questionNumber}</span></span>
                        ) : (
                            <span>Chuẩn bị...</span>
                        )}
                    </div>
                </div>
                <AudioPlayer
                    src={audioUrl}
                    mode="full"
                    autoPlay
                    onTime={onTime}
                    onEnded={() => setEnded(true)}
                />
            </div>
        </div>
    );
}
