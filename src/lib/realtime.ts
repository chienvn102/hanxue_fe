/**
 * OpenAI Realtime WebRTC client.
 *
 * Lifecycle:
 *   const c = new RealtimeClient();
 *   c.onTranscript = (role, text, done) => { ... };
 *   c.onStatus = (status) => { ... };
 *   c.onError = (err) => { ... };
 *   await c.connect(ephemeralKey, model);
 *   ...
 *   c.disconnect();
 *
 * The ephemeral key MUST come from POST /api/realtime/session (server mints it
 * using the master OPENAI_API_KEY). Never put OPENAI_API_KEY in the browser.
 */

export type RealtimeRole = 'user' | 'assistant';
export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

interface OpenAiRealtimeEvent {
    type: string;
    [k: string]: unknown;
}

export class RealtimeClient {
    private pc: RTCPeerConnection | null = null;
    private dc: RTCDataChannel | null = null;
    private localStream: MediaStream | null = null;
    private audioEl: HTMLAudioElement | null = null;

    onTranscript?: (role: RealtimeRole, text: string, done: boolean) => void;
    /**
     * Fires when the server VAD detects the user has started speaking, BEFORE
     * the transcription stream begins. The UI should reserve a placeholder
     * "user" slot here so messages don't end up out of chronological order
     * (AI reply often starts streaming before Whisper finalises the user text).
     */
    onUserSpeechStarted?: () => void;
    onStatus?: (status: RealtimeStatus) => void;
    onError?: (err: Error) => void;

    private status: RealtimeStatus = 'idle';

    private setStatus(s: RealtimeStatus) {
        this.status = s;
        this.onStatus?.(s);
    }

    getStatus(): RealtimeStatus {
        return this.status;
    }

    async connect(ephemeralKey: string, model: string): Promise<void> {
        if (this.pc) {
            throw new Error('Already connected — call disconnect() first');
        }
        this.setStatus('connecting');

        try {
            const pc = new RTCPeerConnection();
            this.pc = pc;

            // Bot audio comes back on this track
            pc.ontrack = (e) => {
                const stream = e.streams[0];
                if (!this.audioEl) {
                    this.audioEl = document.createElement('audio');
                    this.audioEl.autoplay = true;
                }
                this.audioEl.srcObject = stream;
            };

            // Capture user mic
            const ms = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            this.localStream = ms;
            ms.getTracks().forEach(t => pc.addTrack(t, ms));

            // Data channel for control + transcripts
            const dc = pc.createDataChannel('oai-events');
            this.dc = dc;
            dc.onopen = () => this.setStatus('connected');
            dc.onmessage = (e) => {
                try {
                    this.handleEvent(JSON.parse(e.data));
                } catch (err) {
                    console.warn('[realtime] bad event JSON', err);
                }
            };
            dc.onclose = () => this.setStatus('closed');

            // SDP exchange with OpenAI Realtime — GA endpoint is /v1/realtime/calls
            // (beta /v1/realtime was retired May 2026).
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const r = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    'Authorization': `Bearer ${ephemeralKey}`,
                    'Content-Type': 'application/sdp',
                },
            });
            if (!r.ok) {
                const errText = await r.text().catch(() => '');
                throw new Error(`OpenAI SDP exchange failed: ${r.status} ${errText.slice(0, 200)}`);
            }
            const answerSdp = await r.text();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        } catch (error) {
            this.setStatus('error');
            this.onError?.(error instanceof Error ? error : new Error(String(error)));
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Push an instruction or text-only user message into the conversation
     * (lets the UI surface a "send text" affordance alongside voice).
     */
    sendUserText(text: string): void {
        if (!this.dc || this.dc.readyState !== 'open') return;
        const event = {
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text }],
            },
        };
        this.dc.send(JSON.stringify(event));
        this.dc.send(JSON.stringify({ type: 'response.create' }));
    }

    private handleEvent(event: OpenAiRealtimeEvent) {
        switch (event.type) {
            // VAD says user started speaking — reserve a placeholder slot
            // BEFORE the AI starts streaming back, so chronological order holds.
            case 'input_audio_buffer.speech_started': {
                this.onUserSpeechStarted?.();
                break;
            }
            // GA: assistant audio transcript stream
            case 'response.output_audio_transcript.delta':
            // Beta alias kept for safety in case OpenAI dual-emits
            case 'response.audio_transcript.delta': {
                const delta = String(event.delta || '');
                if (delta) this.onTranscript?.('assistant', delta, false);
                break;
            }
            case 'response.output_audio_transcript.done':
            case 'response.audio_transcript.done': {
                const text = String(event.transcript || '');
                this.onTranscript?.('assistant', text, true);
                break;
            }
            // GA: user input audio transcription stream (Whisper)
            case 'conversation.item.input_audio_transcription.delta': {
                const delta = String(event.delta || '');
                if (delta) this.onTranscript?.('user', delta, false);
                break;
            }
            case 'conversation.item.input_audio_transcription.completed': {
                const text = String(event.transcript || '');
                if (text) this.onTranscript?.('user', text, true);
                break;
            }
            case 'error': {
                const e = event.error as { message?: string } | undefined;
                this.onError?.(new Error(e?.message || 'realtime error'));
                break;
            }
            default:
                // Ignore other event types (session.created, rate_limits.updated, etc.)
                break;
        }
    }

    async disconnect(): Promise<void> {
        try { this.dc?.close(); } catch { /* noop */ }
        try { this.pc?.close(); } catch { /* noop */ }
        try {
            this.localStream?.getTracks().forEach(t => t.stop());
        } catch { /* noop */ }
        if (this.audioEl) {
            try { this.audioEl.pause(); } catch { /* noop */ }
            this.audioEl.srcObject = null;
        }
        this.dc = null;
        this.pc = null;
        this.localStream = null;
        if (this.status !== 'error') this.setStatus('closed');
    }
}

// =============================================================================
// Helper to mint ephemeral session from backend
// =============================================================================

export interface RealtimeSession {
    clientSecret: string;
    expiresAt: number;
    model: string;
    voice: string;
}

export async function mintRealtimeSession(apiBase: string, token: string): Promise<RealtimeSession> {
    const res = await fetch(`${apiBase}/api/realtime/session`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Realtime session failed (${res.status})`);
    }
    const data = await res.json();
    if (!data.success || !data.data?.clientSecret) {
        throw new Error(data.message || 'Server không cấp được ephemeral key');
    }
    return data.data as RealtimeSession;
}
