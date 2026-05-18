'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import {
    fetchPendingNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    type NotificationItem,
} from '@/lib/api';

const POLL_INTERVAL_MS = 60_000;

function relativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'Vừa xong';
    const min = Math.floor(ms / 60_000);
    if (min < 60) return `${min} phút trước`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} ngày trước`;
    return new Date(iso).toLocaleDateString('vi-VN');
}

export function NotificationBell() {
    const { isAuthenticated } = useAuth();
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const refreshCount = useCallback(async () => {
        if (!isAuthenticated) {
            setUnread(0);
            return;
        }
        try {
            const n = await fetchUnreadCount();
            setUnread(n);
        } catch {
            // silent — non-critical
        }
    }, [isAuthenticated]);

    // Polling unread count
    useEffect(() => {
        if (!isAuthenticated) return;
        refreshCount();
        const tick = () => {
            if (document.visibilityState === 'visible') refreshCount();
        };
        const interval = setInterval(tick, POLL_INTERVAL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [isAuthenticated, refreshCount]);

    // Click outside to close
    useEffect(() => {
        if (!open) return;
        const handle = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [open]);

    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const list = await fetchPendingNotifications();
            setItems(list);
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next) loadList();
    };

    const handleItemClick = async (item: NotificationItem) => {
        if (!item.read_at) {
            // optimistic — bump local state, fire request
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i));
            setUnread(prev => Math.max(0, prev - 1));
            markNotificationRead(item.id).catch(() => {});
        }
        setOpen(false);
    };

    const handleMarkAll = async () => {
        if (unread === 0) return;
        setItems(prev => prev.map(i => i.read_at ? i : { ...i, read_at: new Date().toISOString() }));
        setUnread(0);
        try {
            await markAllNotificationsRead();
        } catch {
            // refresh to recover real state
            refreshCount();
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={toggleOpen}
                className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)] transition-colors"
                aria-label={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ''}`}
                aria-expanded={open}
            >
                <Icon name="notifications" filled={unread > 0} />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--surface)]">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden z-50 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                        <h3 className="font-semibold text-[var(--text-main)]">Thông báo</h3>
                        {unread > 0 && (
                            <button
                                onClick={handleMarkAll}
                                className="text-xs text-[var(--primary)] hover:underline"
                            >
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-sm text-[var(--text-muted)]">Đang tải...</div>
                        ) : items.length === 0 ? (
                            <div className="p-8 text-center">
                                <Icon name="notifications_off" size="lg" className="text-[var(--text-muted)] mb-2 inline-block" />
                                <p className="text-sm text-[var(--text-muted)]">Chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <ul>
                                {items.map(item => (
                                    <li key={item.id} className={`border-b border-[var(--border)] last:border-0 ${!item.read_at ? 'bg-[var(--primary)]/5' : ''}`}>
                                        <Link
                                            href={item.url || '/'}
                                            onClick={() => handleItemClick(item)}
                                            className="block px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.read_at ? 'bg-[var(--surface-secondary)] text-[var(--text-muted)]' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                                                    <Icon name={item.icon || 'notifications'} size="sm" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <p className={`text-sm truncate ${item.read_at ? 'text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-main)]'}`}>
                                                            {item.title}
                                                        </p>
                                                        {!item.read_at && (
                                                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" aria-hidden />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{item.body}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{relativeTime(item.created_at)}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="border-t border-[var(--border)]">
                        <Link
                            href="/notifications"
                            onClick={() => setOpen(false)}
                            className="block px-4 py-3 text-center text-sm font-medium text-[var(--primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                        >
                            Xem tất cả
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
