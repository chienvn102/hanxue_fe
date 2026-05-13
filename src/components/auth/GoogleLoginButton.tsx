'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

interface GoogleCredentialResponse {
    credential?: string;
}

interface GoogleAccountsId {
    initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
    }): void;
    renderButton(
        parent: HTMLElement,
        options: {
            theme: 'outline' | 'filled_blue' | 'filled_black';
            size: 'large' | 'medium' | 'small';
            text: 'continue_with' | 'signin_with' | 'signup_with';
            shape: 'rectangular' | 'pill' | 'circle' | 'square';
            width: number;
            logo_alignment: 'left' | 'center';
        }
    ): void;
}

declare global {
    interface Window {
        google?: {
            accounts?: {
                id?: GoogleAccountsId;
            };
        };
    }
}

interface GoogleLoginButtonProps {
    disabled?: boolean;
    onCredential: (credential: string) => void | Promise<void>;
    onError?: (message: string) => void;
}

export default function GoogleLoginButton({ disabled = false, onCredential, onError }: GoogleLoginButtonProps) {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [scriptReady, setScriptReady] = useState(false);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!scriptReady || !clientId || !buttonRef.current || !window.google?.accounts?.id) {
            return;
        }

        const buttonWidth = Math.max(240, Math.min(buttonRef.current.offsetWidth || 384, 400));
        buttonRef.current.innerHTML = '';

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
                if (disabled) return;

                if (!response.credential) {
                    onError?.('Không nhận được thông tin đăng nhập Google.');
                    return;
                }

                void onCredential(response.credential);
            }
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: buttonWidth,
            logo_alignment: 'left'
        });
    }, [clientId, disabled, onCredential, onError, scriptReady]);

    if (!clientId) {
        return (
            <button
                type="button"
                disabled
                className="w-full py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] font-semibold opacity-70"
            >
                Google login chưa được cấu hình
            </button>
        );
    }

    return (
        <>
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={() => setScriptReady(true)}
                onError={() => onError?.('Không tải được Google Sign-In.')}
            />
            <div className={`w-full flex justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
                <div ref={buttonRef} className="w-full min-h-[44px] flex justify-center" />
            </div>
        </>
    );
}
