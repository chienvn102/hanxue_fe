'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getVapidPublicKey, subscribePush } from '@/lib/api';
import { Icon } from './ui/Icon';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationPrompt() {
    const { isAuthenticated, loading } = useAuth();
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (loading || !isAuthenticated) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
        if (Notification.permission === 'denied') return;
        if (localStorage.getItem('hanxue-push-dismissed') === '1') return;

        navigator.serviceWorker.register('/sw.js').then(async registration => {
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription && Notification.permission === 'default') setVisible(true);
        }).catch(() => {});
    }, [isAuthenticated, loading]);

    const enable = async () => {
        try {
            setBusy(true);
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                localStorage.setItem('hanxue-push-dismissed', '1');
                setVisible(false);
                return;
            }

            const publicKey = await getVapidPublicKey();
            if (!publicKey) throw new Error('Missing VAPID public key');

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            await subscribePush(subscription);
            setVisible(false);
        } catch (error) {
            console.error('Enable notifications failed:', error);
            setVisible(false);
        } finally {
            setBusy(false);
        }
    };

    const dismiss = () => {
        localStorage.setItem('hanxue-push-dismissed', '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl p-4">
            <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                    <Icon name="notifications" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text-main)]">Bat nhac hoc</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Nhan thong bao khi den gio hoc va khi streak sap dut.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={enable}
                            disabled={busy}
                            className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-60"
                        >
                            {busy ? 'Dang bat...' : 'Bat'}
                        </button>
                        <button
                            type="button"
                            onClick={dismiss}
                            className="px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] text-sm font-medium"
                        >
                            De sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
