'use client';

import { useState } from 'react';
import { AudioPlayer } from './AudioPlayer';

interface Props {
    audioUrl: string;
    sectionTitle?: string;
    /** Gọi khi audio chạy hết — để trang mở khóa các phần còn lại. */
    onEnded?: () => void;
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
export function FullTestAudio({ audioUrl, sectionTitle, onEnded }: Props) {
    const [ended, setEnded] = useState(false);
    // Thu gọn thanh audio để có thêm không gian. KHÔNG đụng logic: AudioPlayer luôn
    // mounted ở cùng vị trí (giữ nút play + trạng thái phát), chỉ ẩn dòng cảnh báo.
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`sticky top-[57px] z-20 bg-amber-500/10 border-b-2 border-amber-500/30 px-4 ${collapsed ? 'py-1.5' : 'py-3'}`}>
            <div className="max-w-4xl mx-auto">
                {!collapsed && (
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
                )}
                <div className="flex items-center gap-2">
                    {collapsed && (
                        <span className="shrink-0 text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400" title="Chế độ thi — audio chỉ phát 1 lần">⚠ Audio</span>
                    )}
                    <div className="flex-1 min-w-0">
                        <AudioPlayer
                            key={audioUrl}
                            src={audioUrl}
                            mode="full"
                            autoPlay
                            maxPlays={1}
                            onEnded={() => { setEnded(true); onEnded?.(); }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Mở thanh audio' : 'Thu gọn thanh audio'}
                        className="shrink-0 text-amber-600 dark:text-amber-400 hover:opacity-80 text-base font-bold leading-none px-1.5 py-0.5"
                    >
                        {collapsed ? '▾' : '▴'}
                    </button>
                </div>
            </div>
        </div>
    );
}
