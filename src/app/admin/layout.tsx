'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/components/AdminAuthContext';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import '@/app/globals.css';

function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading, logout, admin } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    // Nhớ trạng thái thu gọn sidebar giữa các lần điều hướng.
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCollapsed(localStorage.getItem('adminSidebarCollapsed') === '1');
        }
    }, []);

    useEffect(() => {
        if (!loading && !isAuthenticated && pathname !== '/admin/login') {
            router.push('/admin/login');
        }
    }, [isAuthenticated, loading, router, pathname]);

    const toggleCollapsed = () => setCollapsed(c => {
        const next = !c;
        if (typeof window !== 'undefined') localStorage.setItem('adminSidebarCollapsed', next ? '1' : '0');
        return next;
    });

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text-muted)]">Loading...</div>;

    if (!isAuthenticated && pathname !== '/admin/login') {
        return null; // Will redirect
    }

    if (pathname === '/admin/login') {
        return <div className="min-h-screen bg-[var(--background)]">{children}</div>;
    }

    const navItems = [
        { href: '/admin/dashboard', icon: 'dashboard', label: 'Tổng quan' },
        { href: '/admin/users', icon: 'people', label: 'Người dùng' },
        { href: '/admin/courses', icon: 'school', label: 'Khóa học' },
        { href: '/admin/vocabulary', icon: 'translate', label: 'Từ vựng' },
        { href: '/admin/grammar', icon: 'text_snippet', label: 'Ngữ pháp' },
        { href: '/admin/grammar-quiz', icon: 'fact_check', label: 'Trắc nghiệm NP' },
        { href: '/admin/hsk-test', icon: 'quiz', label: 'Đề thi HSK (v1)' },
        { href: '/admin/hsk-test-v2', icon: 'assignment', label: 'Đề thi HSK (v2)' },
        { href: '/admin/feedback', icon: 'forum', label: 'Phản hồi bài học' },
    ];

    return (
        <div className="min-h-screen bg-[var(--background)] flex">
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[var(--surface)] border-r border-[var(--border)] flex flex-col fixed inset-y-0 z-10 transition-all duration-200`}>
                <div className={`h-16 flex items-center border-b border-[var(--border)] ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
                    {!collapsed && <span className="text-lg font-bold text-[var(--primary)] truncate">HanXue Admin</span>}
                    <button
                        onClick={toggleCollapsed}
                        title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                        aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)] transition-colors"
                    >
                        <Icon name={collapsed ? 'menu' : 'chevron_left'} />
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => {
                        // Exact-segment match: '/admin/hsk-test-v2' không làm sáng luôn '/admin/hsk-test' (v1).
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={item.label}
                                className={`flex items-center gap-3 py-3 rounded-xl text-sm font-medium transition-colors ${collapsed ? 'justify-center px-0' : 'px-4'} ${isActive
                                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)]'
                                    }`}
                            >
                                <Icon name={item.icon} />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-[var(--border)]">
                    {collapsed ? (
                        <div className="flex justify-center mb-1">
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-main)]" title={admin?.username}>
                                {admin?.username.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 px-2 py-2 mb-1">
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-main)] shrink-0">
                                {admin?.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-[var(--text-main)] truncate">{admin?.username}</p>
                                <p className="text-xs text-[var(--text-muted)] capitalize">{admin?.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        title="Đăng xuất"
                        className={`w-full flex items-center gap-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ${collapsed ? 'justify-center px-0' : 'px-4'}`}
                    >
                        <Icon name="logout" className="text-red-500" />
                        {!collapsed && 'Đăng xuất'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 ${collapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-200`}>
                {children}
            </main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminAuthProvider>
            <AdminProtectedLayout>{children}</AdminProtectedLayout>
        </AdminAuthProvider>
    );
}
