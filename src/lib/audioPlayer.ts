/**
 * Singleton audio player — đảm bảo chỉ 1 audio TTS phát cùng lúc.
 * Dùng cho chat conversation mode, vocab preview, HSK exam listening.
 *
 * - `playOnce(urlOrBlob)`: dừng audio cũ rồi play audio mới
 * - `stopCurrent()`: dừng audio đang phát (no-op nếu không có gì phát)
 * - `subscribe(cb)`: nhận event 'play' | 'stop' | 'end' để UI sync state
 */

type Listener = (event: 'play' | 'stop' | 'end', audio: HTMLAudioElement | null) => void;

let current: HTMLAudioElement | null = null;
const listeners = new Set<Listener>();

function emit(event: 'play' | 'stop' | 'end', audio: HTMLAudioElement | null) {
    for (const l of listeners) {
        try { l(event, audio); } catch { /* ignore */ }
    }
}

export function playOnce(urlOrBlob: string | Blob): HTMLAudioElement {
    stopCurrent();
    const src = typeof urlOrBlob === 'string' ? urlOrBlob : URL.createObjectURL(urlOrBlob);
    const audio = new Audio(src);
    current = audio;

    audio.addEventListener('ended', () => {
        if (current === audio) {
            current = null;
            emit('end', audio);
        }
    });
    audio.addEventListener('error', () => {
        if (current === audio) {
            current = null;
            emit('end', audio);
        }
    });

    audio.play().catch(err => {
        // Browser autoplay policy có thể block; vẫn báo qua emit để FE biết
        console.warn('[audioPlayer] play failed:', err.message);
        if (current === audio) {
            current = null;
            emit('end', audio);
        }
    });
    emit('play', audio);
    return audio;
}

export function stopCurrent(): void {
    if (current) {
        const audio = current;
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch { /* ignore */ }
        current = null;
        emit('stop', audio);
    }
}

export function isPlaying(): boolean {
    return current !== null && !current.paused;
}

export function getCurrent(): HTMLAudioElement | null {
    return current;
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
