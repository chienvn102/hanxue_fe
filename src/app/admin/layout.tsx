'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/components/AdminAuthContext';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import '@/app/globals.css';

function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading, logout, admin } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !isAuthenticated && pathname !== '/admin/login') {
            router.push('/admin/login');
        }
    }, [isAuthenticated, loading, router, pathname]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text-muted)]">Loading...</div>;

    if (!isAuthenticated && pathname !== '/admin/login') {
        return null; // Will redirect
    }

    if (pathname === '/admin/login') {
        return <div className="min-h-screen bg-[var(--background)]">{children}</div>;
    }

    const navItems = [
        { href: '/admin/dashboard', icon: 'dashboard', label: 'Tổng quan' },
        { href: '/admin/courses', icon: 'school', label: 'Khóa học' },
        { href: '/admin/vocabulary', icon: 'translate', label: 'Từ vựng' },
        { href: '/admin/grammar', icon: 'text_snippet', label: 'Ngữ pháp' },
        { href: '/admin/hsk-test', icon: 'quiz', label: 'Đề thi HSK' },
    ];

    return (
        <div className="min-h-screen bg-[var(--background)] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col fixed inset-y-0 z-10">
                <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
                    <span className="text-xl font-bold text-[var(--primary)]">HanXue Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(item => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive
                                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)]'
                                    }`}
                            >
                                <Icon name={item.icon} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-main)]">
                            {admin?.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-[var(--text-main)] truncate">{admin?.username}</p>
                            <p className="text-xs text-[var(--text-muted)] capitalize">{admin?.role.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <Icon name="logout" className="text-red-500" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
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
