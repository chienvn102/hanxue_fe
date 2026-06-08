'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { applyToneMark, TONE_COLOR } from '@/lib/pinyinChart';
import { fetchSyllableAudio, submitShadow } from '@/lib/api';
import { isRecordingSupported, requestMicPermission, startRecording } from '@/lib/audioRecorder';
import { playOnce, stopCurrent } from '@/lib/audioPlayer';

const SHADOWS = [
    { syll: 'ni3', char: '你' }, { syll: 'hao3', char: '好' },
    { syll: 'wo3', char: '我' }, { syll: 'shi4', char: '是' },
    { syll: 'bu4', char: '不' }, { syll: 'mai3', char: '买' },
    { syll: 'mai4', char: '卖' }, { syll: 'xie4', char: '谢' },
    { syll: 'qing3', char: '请' }, { syll: 'zai4', char: '在' },
    { syll: 'lai2', char: '来' }, { syll: 'qu4', char: '去' },
];

export function ShadowPanel() {
    const [idx, setIdx] = useState(0);
    const [rate, setRate] = useState(1);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [userBlobUrl, setUserBlobUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const recorderRef = useRef<{ stop: () => Promise<Blob>; cancel: () => void } | null>(null);

    const current = SHADOWS[idx % SHADOWS.length];
    const tone = parseInt(current.syll.slice(-1), 10);

    useEffect(() => {
        let cancelled = false;
        setAudioUrl(null);
        setScore(null);
        setUserBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        fetchSyllableAudio(current.syll)
            .then(r => { if (!cancelled) setAudioUrl(r.audio_url); })
            .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi audio'); });
        return () => { cancelled = true; };
    }, [current.syll]);

    const playNative = useCallback(() => {
        if (!audioUrl) return;
        const a = playOnce(audioUrl);
        a.playbackRate = rate;
    }, [audioUrl, rate]);

    const playUser = useCallback(() => {
        if (userBlobUrl) playOnce(userBlobUrl);
    }, [userBlobUrl]);

    const startRec = useCallback(async () => {
        if (!isRecordingSupported()) { setError('Trình duyệt không hỗ trợ.'); return; }
        if (!await requestMicPermission()) { setError('Chưa cấp quyền mic.'); return; }
        try {
            stopCurrent();
            recorderRef.current = await startRecording();
            setIsRecording(true);
            setError(null);
        } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi mic'); }
    }, []);

    const stopRec = useCallback(async () => {
        if (!recorderRef.current) return;
        setIsRecording(false);
        setIsProcessing(true);
        try {
            const blob = await recorderRef.current.stop();
            recorderRef.current = null;
            if (blob.size === 0) { setError('Không ghi được.'); setIsProcessing(false); return; }
            const url = URL.createObjectURL(blob);
            setUserBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
            const res = await submitShadow({
                audio: blob,
                syllable: current.syll,
                tone,
                playbackRate: rate,
                referenceUrl: audioUrl || undefined,
            });
            setScore(res.score);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi chấm');
        } finally {
            setIsProcessing(false);
        }
    }, [current.syll, tone, rate, audioUrl]);

    useEffect(() => () => {
        recorderRef.current?.cancel();
        if (userBlobUrl) URL.revokeObjectURL(userBlobUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="space-y-4">
            {/* Word card */}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 text-center">
                <div className="text-6xl font-bold text-[var(--text-main)] mb-2">{current.char}</div>
                <div className="text-xl font-semibold" style={{ color: TONE_COLOR[tone] }}>
                    {applyToneMark(current.syll)}
                </div>
            </div>

            {/* Speed slider */}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] mb-2">
                    <span>Tốc độ phát mẫu</span>
                    <span className="text-[var(--primary)]">{rate}x</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[0.5, 0.75, 1].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRate(r)}
                            className={`py-1.5 rounded-md text-xs font-semibold ${
                                rate === r
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                            }`}
                        >
                            {r}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={playNative}
                    disabled={!audioUrl}
                    className="py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                    <Icon name="play_arrow" size="sm" /> Nghe mẫu
                </button>
                <button
                    onClick={playUser}
                    disabled={!userBlobUrl}
                    className="py-3 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-main)] text-sm font-semibold border border-[var(--border)] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                    <Icon name="hearing" size="sm" /> Nghe lại bạn
                </button>
            </div>

            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 flex flex-col items-center gap-3">
                <button
                    onClick={isRecording ? stopRec : startRec}
                    disabled={isProcessing}
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        isRecording ? 'bg-[var(--error)] text-white animate-pulse'
                            : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                    } disabled:opacity-50`}
                >
                    <Icon name={isRecording ? 'stop' : 'mic'} size="lg" />
                </button>
                <p className="text-xs text-[var(--text-muted)]">
                    {isProcessing ? 'Đang lưu…' : isRecording ? 'Đang ghi…' : 'Nhấn mic và lặp lại'}
                </p>
                {error && <p className="text-xs text-[var(--error)]">{error}</p>}
            </div>

            {/* Score */}
            {score !== null && (
                <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3 text-center">
                    <div className="text-xs text-[var(--text-muted)]">Điểm shadow</div>
                    <div className={`text-2xl font-bold ${
                        score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'
                    }`}>{score}/100</div>
                </div>
            )}

            {/* Next */}
            <button
                onClick={() => setIdx(i => (i + 1) % SHADOWS.length)}
                className="w-full py-2 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)]"
            >
                Câu tiếp →
            </button>
        </div>
    );
}
