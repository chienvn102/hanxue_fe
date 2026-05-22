'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import {
    fetchAdminFeedback,
    adminResolveFeedback,
    adminHideFeedback,
    adminReplyFeedback,
    type LessonFeedbackAdminItem,
} from '@/lib/api';

type Filter = 'pending' | 'all' | 'resolved';
type KindFilter = '' | 'comment' | 'feedback' | 'bug';

const KIND_LABEL: Record<string, { label: string; icon: string; color: string }> = {
    comment:  { label: 'Bình luận', icon: 'chat',       color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    feedback: { label: 'Đánh giá',  icon: 'star',        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    bug:      { label: 'Báo lỗi',    icon: 'bug_report',  color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
};

function relTime(iso: string): string {
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

export default function AdminFeedbackPage() {
    const [status, setStatus] = useState<Filter>('pending');
    const [kind, setKind] = useState<KindFilter>('');
    const [items, setItems] = useState<LessonFeedbackAdminItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyOpen, setReplyOpen] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAdminFeedback({ status, kind: kind || undefined, limit: 100 });
            setItems(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [status, kind]);

    useEffect(() => { load(); }, [load]);

    const handleResolve = async (fid: number, resolved: boolean) => {
        setBusy(true);
        try {
            await adminResolveFeedback(fid, resolved);
            await load();
        } finally {
            setBusy(false);
        }
    };

    const handleHide = async (fid: number) => {
        if (!confirm('Ẩn phản hồi này?')) return;
        setBusy(true);
        try {
            await adminHideFeedback(fid, true);
            await load();
        } finally {
            setBusy(false);
        }
    };

    const handleReply = async (fid: number) => {
        if (!replyText.trim()) return;
        setBusy(true);
        try {
            await adminReplyFeedback(fid, replyText);
            setReplyText('');
            setReplyOpen(null);
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Lỗi trả lời');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="ml-64 min-h-screen p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Phản hồi bài học</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Yêu cầu: tài khoản phải có <code className="text-xs bg-[var(--surface-secondary)] px-1 rounded">role=&apos;admin&apos;</code> trong bảng <code className="text-xs bg-[var(--surface-secondary)] px-1 rounded">users</code> + đăng nhập phía user.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <div className="flex gap-1">
                        {(['pending', 'all', 'resolved'] as Filter[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    status === s
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                                }`}
                            >
                                {s === 'pending' ? 'Chờ xử lý' : s === 'resolved' ? 'Đã xử lý' : 'Tất cả'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1 ml-auto">
                        {(['', 'bug', 'feedback', 'comment'] as KindFilter[]).map(k => (
                            <button
                                key={k}
                                onClick={() => setKind(k)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    kind === k
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                                }`}
                            >
                                {k === '' ? 'Mọi loại' : KIND_LABEL[k].label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-12 text-center text-[var(--text-muted)]">Đang tải...</div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center text-[var(--text-muted)]">Không có phản hồi nào</div>
                ) : (
                    <ul className="space-y-3">
                        {items.map(item => {
                            const meta = KIND_LABEL[item.kind] || KIND_LABEL.comment;
                            return (
                                <li key={item.id} className={`p-4 rounded-xl border ${
                                    item.is_resolved === 1
                                        ? 'border-[var(--border)] bg-[var(--surface)] opacity-75'
                                        : item.kind === 'bug'
                                            ? 'border-red-500/30 bg-red-500/5'
                                            : 'border-[var(--border)] bg-[var(--surface)]'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${meta.color}`}>
                                            <Icon name={meta.icon} size="xs" />
                                            {meta.label}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                                <Link
                                                    href={`/admin/lessons/${item.lesson_id}/editor`}
                                                    className="text-sm font-semibold text-[var(--primary)] hover:underline"
                                                >
                                                    {item.lesson_title}
                                                </Link>
                                                <span className="text-xs text-[var(--text-muted)]">·</span>
                                                <span className="text-xs text-[var(--text-secondary)]">
                                                    {item.display_name}
                                                </span>
                                                {item.role === 'admin' || item.role === 'super_admin' ? (
                                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">Admin</span>
                                                ) : null}
                                                {item.section_type && (
                                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                                        {item.section_type}
                                                    </span>
                                                )}
                                                {item.rating && (
                                                    <span className="text-xs text-amber-500 inline-flex items-center">
                                                        {Array.from({ length: item.rating }).map((_, i) => (
                                                            <Icon key={i} name="star" filled size="xs" />
                                                        ))}
                                                    </span>
                                                )}
                                                <span className="text-xs text-[var(--text-muted)] ml-auto">{relTime(item.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-[var(--text-main)] whitespace-pre-wrap break-words">{item.content}</p>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 mt-3">
                                                {item.is_resolved === 0 ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleResolve(item.id, true)}
                                                        disabled={busy}
                                                    >
                                                        <Icon name="check" size="xs" />
                                                        Đã xử lý
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleResolve(item.id, false)}
                                                        disabled={busy}
                                                    >
                                                        <Icon name="undo" size="xs" />
                                                        Mở lại
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setReplyOpen(replyOpen === item.id ? null : item.id)}
                                                >
                                                    <Icon name="reply" size="xs" />
                                                    Trả lời
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleHide(item.id)}
                                                    disabled={busy}
                                                    className="!text-red-500 hover:!bg-red-500/10"
                                                >
                                                    <Icon name="visibility_off" size="xs" />
                                                    Ẩn
                                                </Button>
                                                <Link
                                                    href={`/lessons/${item.lesson_id}#feedback-${item.id}`}
                                                    target="_blank"
                                                    className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] inline-flex items-center gap-1 ml-auto"
                                                >
                                                    <Icon name="open_in_new" size="xs" />
                                                    Xem bài học
                                                </Link>
                                            </div>

                                            {replyOpen === item.id && (
                                                <div className="mt-3 space-y-2">
                                                    <textarea
                                                        value={replyText}
                                                        onChange={e => setReplyText(e.target.value)}
                                                        placeholder="Trả lời với tư cách admin..."
                                                        rows={3}
                                                        maxLength={2000}
                                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[var(--primary)] outline-none resize-none"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setReplyOpen(null); setReplyText(''); }}
                                                            className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                                                        >
                                                            Huỷ
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReply(item.id)}
                                                            disabled={busy || !replyText.trim()}
                                                            className="px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                                                        >
                                                            Gửi trả lời
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
