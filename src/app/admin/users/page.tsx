'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Icon } from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface User {
    id: number;
    email: string;
    display_name: string;
    avatar_url?: string;
    role: 'user' | 'admin';
    target_hsk: number | null;
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    total_study_days: number;
    last_study_date?: string | null;
    created_at: string;
    is_premium: boolean | number;
    email_verified: boolean | number;
    is_active: boolean | number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface Stats {
    total_users: number;
    new_7d: number;
    new_30d: number;
    active_7d: number;
    admin_count: number;
    premium_count: number;
    byHsk: Array<{ target_hsk: number | null; count: number }>;
}

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];

export default function AdminUsersPage() {
    const { token } = useAdminAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });

    const [search, setSearch] = useState('');
    const [hsk, setHsk] = useState('');
    const [sort, setSort] = useState('created_at_desc');
    const [page, setPage] = useState(1);

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams({ page: String(page), limit: '20', sort });
            if (search.trim()) qs.set('search', search.trim());
            if (hsk) qs.set('hsk', hsk);
            const res = await fetch(`${API_BASE}/api/admin/users?${qs}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setUsers(data.data || []);
            setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err) {
            console.error('fetch users error:', err);
        } finally {
            setLoading(false);
        }
    }, [token, page, sort, search, hsk]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_BASE}/api/admin/users/stats`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(r => { if (r.success) setStats(r.data); })
            .catch(err => console.error('stats error', err));
    }, [token]);

    const onFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const clearFilters = () => {
        setSearch(''); setHsk(''); setSort('created_at_desc'); setPage(1);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Quản lý người dùng</h1>
                    <p className="text-[var(--text-muted)] text-sm">
                        Tổng {pagination.total.toLocaleString('vi-VN')} người dùng
                    </p>
                </div>
            </div>

            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard icon="group" label="Tổng người dùng" value={stats.total_users} accent="primary" />
                    <StatCard icon="person_add" label="Mới 7 ngày" value={stats.new_7d} accent="green" />
                    <StatCard icon="local_fire_department" label="Hoạt động 7 ngày" value={stats.active_7d} accent="orange" />
                    <StatCard icon="workspace_premium" label="Premium" value={stats.premium_count} accent="purple" />
                </div>
            )}

            {/* HSK distribution */}
            {stats?.byHsk?.length ? (
                <div className="mb-6 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Phân bố theo mục tiêu HSK</p>
                    <div className="flex flex-wrap gap-2">
                        {stats.byHsk.map(({ target_hsk, count }) => (
                            <span
                                key={target_hsk ?? 'null'}
                                className="px-3 py-1 rounded-full text-xs bg-[var(--surface-secondary)] text-[var(--text-main)]"
                            >
                                {target_hsk == null ? 'Chưa chọn' : `HSK ${target_hsk}`}: <strong>{count}</strong>
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Filters */}
            <form
                onSubmit={onFilterSubmit}
                className="flex flex-wrap items-center gap-2 mb-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
            >
                <input
                    type="text"
                    placeholder="Tìm theo email hoặc tên..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg bg-[var(--surface-secondary)] text-[var(--text-main)]"
                />
                <select
                    value={hsk}
                    onChange={e => { setHsk(e.target.value); setPage(1); }}
                    className="px-3 py-2 border rounded-lg bg-[var(--surface-secondary)] text-[var(--text-main)]"
                >
                    <option value="">Tất cả HSK</option>
                    {HSK_LEVELS.map(n => <option key={n} value={n}>HSK {n}</option>)}
                </select>
                <select
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-[var(--surface-secondary)] text-[var(--text-main)]"
                >
                    <option value="created_at_desc">Mới đăng ký</option>
                    <option value="created_at_asc">Đăng ký cũ nhất</option>
                    <option value="xp_desc">XP cao nhất</option>
                    <option value="streak_desc">Streak dài nhất</option>
                    <option value="last_active_desc">Hoạt động gần đây</option>
                    <option value="email_asc">Email A-Z</option>
                </select>
                <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition"
                >
                    Lọc
                </button>
                <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition"
                >
                    Xóa lọc
                </button>
            </form>

            {/* Table */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">Tên</th>
                                <th className="px-4 py-3 text-center">HSK</th>
                                <th className="px-4 py-3 text-right">XP</th>
                                <th className="px-4 py-3 text-center">Streak</th>
                                <th className="px-4 py-3 text-left">Đăng ký</th>
                                <th className="px-4 py-3 text-center">Vai trò</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">Đang tải...</td></tr>
                            )}
                            {!loading && users.length === 0 && (
                                <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">Không có người dùng nào.</td></tr>
                            )}
                            {!loading && users.map(u => (
                                <tr key={u.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-secondary)]">
                                    <td className="px-4 py-3 text-[var(--text-muted)]">#{u.id}</td>
                                    <td className="px-4 py-3 text-[var(--text-main)]">
                                        <div className="flex items-center gap-2">
                                            <span>{u.email}</span>
                                            {!u.email_verified && (
                                                <span title="Chưa xác thực email" className="text-yellow-500">
                                                    <Icon name="warning" size="sm" />
                                                </span>
                                            )}
                                            {!u.is_active && (
                                                <span title="Đã bị khóa" className="text-red-500">
                                                    <Icon name="block" size="sm" />
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-main)]">{u.display_name || '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                        {u.target_hsk ? (
                                            <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-[var(--primary)]">
                                                HSK {u.target_hsk}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">{u.total_xp.toLocaleString('vi-VN')}</td>
                                    <td className="px-4 py-3 text-center text-xs text-[var(--text-muted)]">
                                        🔥{u.current_streak} / {u.longest_streak}
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {u.role === 'admin' ? (
                                            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/15 text-purple-600 dark:text-purple-300">Admin</span>
                                        ) : u.is_premium ? (
                                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/15 text-yellow-700 dark:text-yellow-300">Premium</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface-secondary)] text-[var(--text-muted)]">User</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-[var(--text-muted)]">
                        Trang {pagination.page} / {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-secondary)] transition text-[var(--text-main)]"
                        >
                            Trước
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page >= pagination.totalPages}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-secondary)] transition text-[var(--text-main)]"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: 'primary' | 'green' | 'orange' | 'purple' }) {
    const colorMap: Record<string, string> = {
        primary: 'bg-[var(--primary)]/10 text-[var(--primary)]',
        green: 'bg-green-500/15 text-green-600 dark:text-green-300',
        orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
        purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
    };
    return (
        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[accent]}`}>
                    <Icon name={icon} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">{label}</p>
                    <p className="text-2xl font-bold text-[var(--text-main)]">{value.toLocaleString('vi-VN')}</p>
                </div>
            </div>
        </div>
    );
}
