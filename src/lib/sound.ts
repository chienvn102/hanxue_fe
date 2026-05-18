/**
 * Sound effects (SFX) for quiz / flashcard feedback.
 *
 * Synthesized via Web Audio API — no external mp3 assets, no licensing.
 * Each SFX is a short envelope-shaped tone (or chord) under ~300ms.
 *
 * Usage:
 *   import { playSfx } from '@/lib/sound';
 *   playSfx('correct');
 *
 * Mute persists in localStorage under `sfx_muted`.
 */

export type SfxName = 'correct' | 'wrong' | 'complete' | 'flip';

const MUTED_KEY = 'sfx_muted';
const VOLUME_KEY = 'sfx_volume';
const DEFAULT_VOLUME = 0.35;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (ctx) return ctx;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
        ctx = new Ctor();
    } catch {
        return null;
    }
    return ctx;
}

function tone(
    audio: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    gain: number,
    type: OscillatorType = 'sine',
) {
    const osc = audio.createOscillator();
    const env = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    // Attack-decay envelope to avoid clicks
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(env).connect(audio.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function sweep(
    audio: AudioContext,
    fromFreq: number,
    toFreq: number,
    startTime: number,
    duration: number,
    gain: number,
    type: OscillatorType = 'sine',
) {
    const osc = audio.createOscillator();
    const env = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(toFreq, startTime + duration);
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(env).connect(audio.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

export function isSfxMuted(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MUTED_KEY) === '1';
}

export function setSfxMuted(muted: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
}

export function getSfxVolume(): number {
    if (typeof window === 'undefined') return DEFAULT_VOLUME;
    const raw = localStorage.getItem(VOLUME_KEY);
    if (!raw) return DEFAULT_VOLUME;
    const v = parseFloat(raw);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : DEFAULT_VOLUME;
}

export function setSfxVolume(volume: number): void {
    if (typeof window === 'undefined') return;
    const v = Math.max(0, Math.min(1, volume));
    localStorage.setItem(VOLUME_KEY, String(v));
}

export function playSfx(name: SfxName): void {
    if (typeof window === 'undefined') return;
    if (isSfxMuted()) return;

    const audio = getCtx();
    if (!audio) return;

    // Resume if suspended (browser autoplay policy — user gesture unlocks it)
    if (audio.state === 'suspended') {
        audio.resume().catch(() => {});
    }

    const volume = getSfxVolume();
    const t0 = audio.currentTime;

    try {
        switch (name) {
            case 'correct': {
                // Bright two-tone chime: C5 → E5
                tone(audio, 523.25, t0, 0.12, volume);
                tone(audio, 659.25, t0 + 0.08, 0.18, volume);
                break;
            }
            case 'wrong': {
                // Low descending buzz: 250Hz → 140Hz
                sweep(audio, 250, 140, t0, 0.22, volume * 0.9, 'square');
                break;
            }
            case 'complete': {
                // Ascending triad C5 → E5 → G5 → C6
                tone(audio, 523.25, t0, 0.16, volume);
                tone(audio, 659.25, t0 + 0.1, 0.16, volume);
                tone(audio, 783.99, t0 + 0.2, 0.18, volume);
                tone(audio, 1046.5, t0 + 0.3, 0.28, volume);
                break;
            }
            case 'flip': {
                // Quick neutral tick
                tone(audio, 880, t0, 0.05, volume * 0.6, 'triangle');
                break;
            }
        }
    } catch (err) {
        // Audio context errors are non-critical
        console.warn('[sfx]', name, err);
    }
}
