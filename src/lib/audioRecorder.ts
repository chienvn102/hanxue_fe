/**
 * Audio Recorder Utility
 * Records microphone audio via MediaRecorder, converts to WAV for Azure Speech API.
 * Browser MediaRecorder outputs webm/opus — we decode and re-encode as WAV PCM.
 */

/** Check if microphone recording is supported */
export function isRecordingSupported(): boolean {
    return typeof navigator !== 'undefined'
        && typeof navigator.mediaDevices?.getUserMedia === 'function'
        && typeof window.MediaRecorder === 'function';
}

/** Request microphone permission. Returns true if granted. */
export async function requestMicPermission(): Promise<boolean> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release immediately — we just needed to check permission
        stream.getTracks().forEach(t => t.stop());
        return true;
    } catch {
        return false;
    }
}

interface RecorderHandle {
    stop: () => Promise<Blob>; // Returns WAV blob
    cancel: () => void;
}

/**
 * Start recording from microphone.
 * Returns a handle with stop() (returns WAV Blob) and cancel().
 */
export async function startRecording(): Promise<RecorderHandle> {
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
            },
        });
    } catch {
        throw new Error('Không thể truy cập microphone.');
    }

    const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
    });
    const chunks: Blob[] = [];
    let cancelled = false;

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    const handle: RecorderHandle = {
        stop: () =>
            new Promise<Blob>((resStop, rejStop) => {
                recorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    if (cancelled || chunks.length === 0) {
                        resStop(new Blob()); // empty
                        return;
                    }
                    try {
                        const webmBlob = new Blob(chunks, { type: recorder.mimeType });
                        const wavBlob = await convertToWav(webmBlob);
                        resStop(wavBlob);
                    } catch (convertErr) {
                        rejStop(convertErr instanceof Error
                            ? convertErr
                            : new Error('Lỗi chuyển đổi audio'));
                    }
                };
                if (recorder.state === 'recording') {
                    recorder.stop();
                } else {
                    // Already stopped — resolve empty
                    stream.getTracks().forEach(t => t.stop());
                    resStop(new Blob());
                }
            }),
        cancel: () => {
            cancelled = true;
            stream.getTracks().forEach(t => t.stop());
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        },
    };

    recorder.start(250); // collect chunks every 250ms
    return handle;
}

/**
 * Convert a webm/audio blob to WAV PCM (mono 16kHz 16-bit) using AudioContext.
 */
async function convertToWav(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    let audioBuffer: AudioBuffer;
    try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
        await audioCtx.close();
    }

    // Resample to 16kHz mono
    const targetRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetRate), targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const resampled = await offlineCtx.startRendering();
    const pcmData = resampled.getChannelData(0);

    // Encode WAV
    const wavBuffer = encodeWav(pcmData, targetRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Encode Float32 PCM samples to WAV format (16-bit, mono)
 */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const numSamples = samples.length;
    const bytesPerSample = 2;
    const blockAlign = bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);           // sub-chunk size
    view.setUint16(20, 1, true);            // PCM format
    view.setUint16(22, 1, true);            // mono
    view.setUint32(24, sampleRate, true);    // sample rate
    view.setUint32(28, byteRate, true);     // byte rate
    view.setUint16(32, blockAlign, true);   // block align
    view.setUint16(34, 16, true);           // bits per sample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM samples (clamp float32 to int16)
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }

    return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
