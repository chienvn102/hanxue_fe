'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { applyToneMark, TONE_COLOR, TONE_SHAPE_VI } from '@/lib/pinyinChart';
import { drawPitchCurves, toneTemplatePoints } from '@/lib/pitchCurve';
import { fetchSyllableAudio, submitToneTrainer, type ToneTrainerResult } from '@/lib/api';
import { isRecordingSupported, requestMicPermission, startRecording } from '@/lib/audioRecorder';
import { playOnce, stopCurrent } from '@/lib/audioPlayer';

const SUGGESTED_BASES = ['ma', 'wo', 'ni', 'hao', 'shi', 'bu', 'wen', 'xie', 'qing', 'mai'];

export function ToneTrainerPanel() {
    const [base, setBase] = useState('ma');
    const [tone, setTone] = useState(1);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<ToneTrainerResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recorderRef = useRef<{ stop: () => Promise<Blob>; cancel: () => void } | null>(null);

    const syllable = `${base}${tone}`;
    const pinyinMarked = applyToneMark(syllable);

    // Load native audio whenever syllable+tone changes
    useEffect(() => {
        let cancelled = false;
        setAudioUrl(null);
        setResult(null);
        fetchSyllableAudio(syllable)
            .then((res) => { if (!cancelled) setAudioUrl(res.audio_url); })
            .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi audio'); });
        return () => { cancelled = true; };
    }, [syllable]);

    // Render canvas
    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        c.width = c.clientWidth * 2;
        c.height = c.clientHeight * 2;
        const layers = [
            {
                label: `Thanh ${tone} (mẫu)`,
                color: TONE_COLOR[tone],
                points: toneTemplatePoints(tone),
                dashed: true,
                thickness: 3,
            },
            ...(result?.user_contour
                ? [{
                    label: 'Bạn',
                    color: '#f97316',
                    points: result.user_contour,
                    thickness: 3.5,
                }]
                : []),
        ];
        drawPitchCurves(c, layers, { grid: true });
    }, [tone, result]);

    const playNative = useCallback(() => {
        if (audioUrl) playOnce(audioUrl);
    }, [audioUrl]);

    const startRec = useCallback(async () => {
        if (!isRecordingSupported()) {
            setError('Trình duyệt không hỗ trợ ghi âm.');
            return;
        }
        const ok = await requestMicPermission();
        if (!ok) { setError('Chưa cấp quyền microphone.'); return; }
        try {
            recorderRef.current = await startRecording();
            setIsRecording(true);
            setError(null);
            stopCurrent();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi mic');
        }
    }, []);

    const stopRec = useCallback(async () => {
        if (!recorderRef.current) return;
        setIsRecording(false);
        setIsProcessing(true);
        try {
            const blob = await recorderRef.current.stop();
            recorderRef.current = null;
            if (blob.size === 0) {
                setError('Không ghi được âm thanh.');
                setIsProcessing(false);
                return;
            }
            const res = await submitToneTrainer({
                audio: blob,
                syllable,
                tone,
                referenceUrl: audioUrl || undefined,
            });
            setResult(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi chấm tone');
        } finally {
            setIsProcessing(false);
        }
    }, [syllable, tone, audioUrl]);

    useEffect(() => () => { recorderRef.current?.cancel(); }, []);

    return (
        <div className="space-y-4">
            {/* Syllable picker */}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                    1) Chọn âm tiết
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {SUGGESTED_BASES.map((b) => (
                        <button
                            key={b}
                            onClick={() => setBase(b)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                base === b
                                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-main)]'
                            }`}
                        >
                            {b}
                        </button>
                    ))}
                    <input
                        type="text"
                        value={base}
                        onChange={(e) => setBase(e.target.value.toLowerCase().replace(/[^a-zü]/g, ''))}
                        placeholder="tự nhập"
                        className="px-2 py-1 rounded-md text-xs border border-[var(--border)] bg-[var(--surface-secondary)] w-20"
                    />
                </div>
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                    2) Chọn thanh
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={`py-2 rounded-md text-sm font-bold transition-all ${
                                tone === t
                                    ? 'text-white shadow-md'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                            }`}
                            style={tone === t ? { background: TONE_COLOR[t] } : undefined}
                        >
                            <div>{t}</div>
                            <div className="text-[10px] font-medium opacity-80">{TONE_SHAPE_VI[t]}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Reference & pinyin */}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center">
                <div className="text-4xl font-bold text-[var(--text-main)] mb-1" style={{ color: TONE_COLOR[tone] }}>
                    {pinyinMarked}
                </div>
                <div className="text-xs text-[var(--text-muted)] mb-3">
                    Thanh {tone} · {TONE_SHAPE_VI[tone]}
                </div>
                <button
                    onClick={playNative}
                    disabled={!audioUrl}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                    <Icon name="play_arrow" size="sm" />
                    Nghe mẫu
                </button>
            </div>

            {/* Canvas pitch curve */}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                    Đường cao độ
                </div>
                <canvas
                    ref={canvasRef}
                    className="w-full h-40 rounded-md"
                />
            </div>

            {/* Record */}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 flex flex-col items-center gap-3">
                <button
                    onClick={isRecording ? stopRec : startRec}
                    disabled={isProcessing}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                            ? 'bg-[var(--error)] text-white animate-pulse'
                            : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                    } disabled:opacity-50`}
                >
                    <Icon name={isRecording ? 'stop' : 'mic'} size="lg" />
                </button>
                <p className="text-xs text-[var(--text-muted)]">
                    {isProcessing ? 'Đang chấm…'
                        : isRecording ? 'Đang ghi… nhấn để dừng'
                        : 'Nhấn mic và phát âm âm tiết'}
                </p>
                {error && <p className="text-xs text-[var(--error)]">{error}</p>}
            </div>

            {/* Result */}
            {result && (
                <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-[var(--text-muted)]">Điểm khớp tone</div>
                        <div className={`text-2xl font-bold ${
                            result.score >= 85 ? 'text-emerald-600'
                                : result.score >= 70 ? 'text-amber-500'
                                : 'text-red-500'
                        }`}>{result.score}/100</div>
                    </div>
                    <p className="text-sm text-[var(--text-main)] leading-relaxed">{result.feedback_vi}</p>
                </div>
            )}
        </div>
    );
}
