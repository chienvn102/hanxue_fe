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

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (!isAuthenticated && pathname !== '/admin/login') {
        return null; // Will redirect
    }

    if (pathname === '/admin/login') {
        return <div className="min-h-screen bg-gray-100">{children}</div>;
    }

    const navItems = [
        { href: '/admin/dashboard', icon: 'dashboard', label: 'Tổng quan' },
        { href: '/admin/courses', icon: 'school', label: 'Khóa học' },
        { href: '/admin/vocabulary', icon: 'translate', label: 'Từ vựng' },
        { href: '/admin/grammar', icon: 'text_snippet', label: 'Ngữ pháp' },
        { href: '/admin/hsk-test', icon: 'quiz', label: 'Đề thi HSK' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-10">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
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
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon name={item.icon} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                            {admin?.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{admin?.username}</p>
                            <p className="text-xs text-gray-500 capitalize">{admin?.role.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
