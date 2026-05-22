'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/AuthContext';
import {
    fetchLessonFeedback,
    postLessonFeedback,
    deleteLessonFeedback,
    type LessonFeedbackItem,
    type LessonFeedbackKind,
    type LessonSectionType,
} from '@/lib/api';

const KIND_LABELS: Record<LessonFeedbackKind, { label: string; icon: string; description: string }> = {
    comment: { label: 'Bình luận',  icon: 'chat',        description: 'Thảo luận chung về bài học' },
    feedback: { label: 'Đánh giá',  icon: 'star',         description: 'Đánh giá chất lượng (kèm rating sao)' },
    bug:      { label: 'Báo lỗi',    icon: 'bug_report',   description: 'Báo lỗi nội dung — admin sẽ xử lý' },
};

const SECTION_LABELS: Record<LessonSectionType, string> = {
    vocab: 'Từ vựng',
    passage: 'Bài khoá',
    grammar: 'Ngữ pháp',
    writing: 'Bài tập',
};

const MAX_VISIBLE_DEPTH = 4;

interface LessonFeedbackPanelProps {
    lessonId: number;
}

interface ThreadNode {
    item: LessonFeedbackItem;
    children: ThreadNode[];
}

function buildThread(items: LessonFeedbackItem[]): ThreadNode[] {
    const byParent = new Map<number, LessonFeedbackItem[]>();
    items.forEach(item => {
        const key = item.parent_id ?? 0;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(item);
    });

    const build = (parentId: number): ThreadNode[] =>
        (byParent.get(parentId) || []).map(item => ({
            item,
            children: build(item.id),
        }));

    return build(0);
}

function relTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'Vừa xong';
    const min = Math.floor(ms / 60_000);
    if (min < 60) return `${min} phút`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} giờ`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} ngày`;
    return new Date(iso).toLocaleDateString('vi-VN');
}

export function LessonFeedbackPanel({ lessonId }: LessonFeedbackPanelProps) {
    const { user, isAuthenticated } = useAuth();
    const [items, setItems] = useState<LessonFeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeKind, setActiveKind] = useState<LessonFeedbackKind>('comment');
    const [content, setContent] = useState('');
    const [sectionType, setSectionType] = useState<LessonSectionType | null>(null);
    const [rating, setRating] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchLessonFeedback(lessonId);
            setItems(data);
        } finally {
            setLoading(false);
        }
    }, [lessonId]);

    useEffect(() => { load(); }, [load]);

    const tree = useMemo(() => buildThread(items), [items]);
    const visibleItems = useMemo(() => items.filter(i => i.kind === activeKind), [items, activeKind]);
    const visibleTree = useMemo(() => {
        // Filter root nodes by kind; children inherit parent's kind context
        const filtered = items.filter(i => i.kind === activeKind || i.parent_id !== null);
        const rootIds = new Set(filtered.filter(i => i.parent_id === null && i.kind === activeKind).map(i => i.id));
        return tree.filter(n => rootIds.has(n.item.id));
    }, [items, activeKind, tree]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            setError('Vui lòng đăng nhập để đăng phản hồi');
            return;
        }
        const text = content.trim();
        if (!text) return;
        setSubmitting(true);
        setError(null);
        try {
            await postLessonFeedback(lessonId, {
                kind: activeKind,
                content: text,
                sectionType,
                rating: activeKind === 'feedback' ? rating : null,
            });
            setContent('');
            setRating(null);
            setSectionType(null);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi gửi');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async (parentId: number, replyContent: string) => {
        const text = replyContent.trim();
        if (!text) return;
        try {
            await postLessonFeedback(lessonId, {
                kind: activeKind,
                content: text,
                parentId,
            });
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Lỗi gửi');
        }
    };

    const handleDelete = async (fid: number) => {
        if (!confirm('Bạn chắc muốn xoá phản hồi này?')) return;
        try {
            await deleteLessonFeedback(fid);
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Lỗi xoá');
        }
    };

    return (
        <section className="mt-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
            <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Icon name="forum" className="text-[var(--primary)]" />
                    Thảo luận & phản hồi
                </h2>
                <span className="text-xs text-[var(--text-muted)]">{items.length} mục</span>
            </div>

            {/* Kind tabs */}
            <div className="flex gap-2 border-b border-[var(--border)]">
                {(Object.keys(KIND_LABELS) as LessonFeedbackKind[]).map(k => (
                    <button
                        key={k}
                        onClick={() => { setActiveKind(k); setRating(null); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
                            activeKind === k
                                ? 'border-[var(--primary)] text-[var(--primary)] font-semibold'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                    >
                        <Icon name={KIND_LABELS[k].icon} size="sm" />
                        {KIND_LABELS[k].label}
                        <span className="text-[10px] opacity-60">({items.filter(i => i.kind === k && i.parent_id === null).length})</span>
                    </button>
                ))}
            </div>

            {/* Post form */}
            {isAuthenticated ? (
                <form onSubmit={handleSubmit} className="space-y-2">
                    <p className="text-xs text-[var(--text-muted)]">{KIND_LABELS[activeKind].description}</p>
                    {activeKind === 'feedback' && (
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-[var(--text-muted)] mr-2">Đánh giá:</span>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setRating(n)}
                                    className={`p-1 transition-colors ${rating && n <= rating ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-300'}`}
                                    aria-label={`${n} sao`}
                                >
                                    <Icon name="star" filled={!!rating && n <= rating} size="md" />
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">Mục:</span>
                        <select
                            value={sectionType ?? ''}
                            onChange={e => setSectionType((e.target.value || null) as LessonSectionType | null)}
                            className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)]"
                        >
                            <option value="">Toàn bài</option>
                            {(Object.keys(SECTION_LABELS) as LessonSectionType[]).map(s => (
                                <option key={s} value={s}>{SECTION_LABELS[s]}</option>
                            ))}
                        </select>
                    </div>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={activeKind === 'bug'
                            ? 'Mô tả lỗi bạn gặp (vd: câu 3 ở mục từ vựng sai pinyin)...'
                            : 'Viết phản hồi của bạn...'}
                        rows={3}
                        maxLength={2000}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none transition-all resize-none"
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <span className="text-[10px] text-[var(--text-muted)] self-center">{content.length}/2000</span>
                        <Button type="submit" disabled={submitting || !content.trim()}>
                            <Icon name="send" size="sm" />
                            {submitting ? 'Đang gửi...' : 'Đăng'}
                        </Button>
                    </div>
                </form>
            ) : (
                <p className="text-sm text-[var(--text-muted)] italic">Đăng nhập để gửi phản hồi.</p>
            )}

            {/* Thread list */}
            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                {loading ? (
                    <p className="text-center text-sm text-[var(--text-muted)] py-4">Đang tải...</p>
                ) : visibleItems.length === 0 ? (
                    <p className="text-center text-sm text-[var(--text-muted)] py-4">
                        Chưa có {KIND_LABELS[activeKind].label.toLowerCase()} nào — hãy là người đầu tiên.
                    </p>
                ) : (
                    visibleTree.map(node => (
                        <FeedbackThread
                            key={node.item.id}
                            node={node}
                            currentUserId={user?.id ?? 0}
                            onReply={handleReply}
                            onDelete={handleDelete}
                            depth={0}
                        />
                    ))
                )}
            </div>
        </section>
    );
}

interface ThreadProps {
    node: ThreadNode;
    currentUserId: number;
    onReply: (parentId: number, content: string) => void;
    onDelete: (fid: number) => void;
    depth: number;
}

function FeedbackThread({ node, currentUserId, onReply, onDelete, depth }: ThreadProps) {
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const { item, children } = node;
    const isAdminReply = item.is_admin_reply === 1 || item.role === 'admin' || item.role === 'super_admin';
    const isOwn = currentUserId > 0 && item.user_id === currentUserId;
    const visualDepth = Math.min(depth, MAX_VISIBLE_DEPTH);

    return (
        <div className={depth > 0 ? `pl-3 border-l-2 ${isAdminReply ? 'border-emerald-500/40' : 'border-[var(--border)]'}` : ''}>
            <div className={`p-3 rounded-xl ${isAdminReply ? 'bg-emerald-500/5' : 'bg-[var(--surface-secondary)]/50'}`}>
                <div className="flex items-start gap-3">
                    {item.avatar_url ? (
                        <img src={item.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center font-bold text-sm shrink-0">
                            {item.display_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-[var(--text-main)]">{item.display_name || 'Người dùng'}</span>
                            {isAdminReply && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Admin
                                </span>
                            )}
                            {item.section_type && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                                    {SECTION_LABELS[item.section_type]}
                                </span>
                            )}
                            {item.rating && (
                                <span className="flex items-center text-xs text-amber-500">
                                    {Array.from({ length: item.rating }).map((_, i) => (
                                        <Icon key={i} name="star" filled size="xs" />
                                    ))}
                                </span>
                            )}
                            {item.is_resolved === 1 && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">Đã xử lý</span>
                            )}
                            <span className="text-xs text-[var(--text-muted)] ml-auto">{relTime(item.created_at)}</span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">{item.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                            <button
                                onClick={() => setReplyOpen(o => !o)}
                                className="hover:text-[var(--primary)] inline-flex items-center gap-1"
                            >
                                <Icon name="reply" size="xs" /> Trả lời
                            </button>
                            {children.length > 0 && (
                                <button
                                    onClick={() => setCollapsed(c => !c)}
                                    className="hover:text-[var(--primary)] inline-flex items-center gap-1"
                                >
                                    <Icon name={collapsed ? 'expand_more' : 'expand_less'} size="xs" />
                                    {collapsed ? `Hiện ${children.length} trả lời` : 'Ẩn'}
                                </button>
                            )}
                            {isOwn && (
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="hover:text-red-500 inline-flex items-center gap-1 ml-auto"
                                >
                                    <Icon name="delete" size="xs" /> Xoá
                                </button>
                            )}
                        </div>
                        {replyOpen && (
                            <div className="mt-2 space-y-2">
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Trả lời..."
                                    rows={2}
                                    maxLength={2000}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[var(--primary)] outline-none resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setReplyOpen(false); setReplyText(''); }}
                                        className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                                    >
                                        Huỷ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!replyText.trim()) return;
                                            onReply(item.id, replyText);
                                            setReplyText('');
                                            setReplyOpen(false);
                                        }}
                                        className="px-3 py-1 text-xs rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                                    >
                                        Gửi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!collapsed && children.length > 0 && (
                <div className={visualDepth >= MAX_VISIBLE_DEPTH ? 'mt-2' : 'mt-2 ml-3'}>
                    {children.map(child => (
                        <FeedbackThread
                            key={child.item.id}
                            node={child}
                            currentUserId={currentUserId}
                            onReply={onReply}
                            onDelete={onDelete}
                            depth={visualDepth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
