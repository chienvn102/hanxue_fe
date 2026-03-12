interface YTPlayer {
    getCurrentTime(): number;
    getDuration(): number;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    destroy(): void;
}

interface Window {
    YT: {
        Player: new (elementId: string, config: {
            height?: string;
            width?: string;
            videoId?: string;
            playerVars?: Record<string, number | string>;
            events?: Record<string, (event: { data: number; target: YTPlayer }) => void>;
        }) => YTPlayer;
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
}
