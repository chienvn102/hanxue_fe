'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthContext';
import { Icon } from './ui/Icon';

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const pathname = usePathname();
    const { resolvedTheme, toggleTheme } = useTheme();
    const { user, isAuthenticated, logout } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const navItems = [
        { href: '/', label: 'Trang chủ', icon: 'home' },
        { href: '/vocab', label: 'Từ vựng', icon: 'menu_book' },
        { href: '/flashcard', label: 'Luyện tập', icon: 'school' },
        { href: '/courses', label: 'Khóa học', icon: 'play_circle' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 sm:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 group-hover:scale-105 transition-transform duration-300">
                            <Icon name="translate" size="md" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                            HanXue
                        </h1>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                        {navItems.map(item => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive
                                        ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)]'
                                        }`}
                                >
                                    {isActive && <Icon name={item.icon} size="sm" className="fill-current" />}
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={(e) => toggleTheme(e)}
                            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)] transition-colors"
                            title={resolvedTheme === 'dark' ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
                        >
                            <Icon name={resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'} />
                        </button>

                        {/* Notebook Link */}
                        {isAuthenticated && (
                            <Link
                                href="/notebook"
                                className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)] transition-colors relative"
                                title="Sổ tay từ vựng"
                            >
                                <Icon name="bookmark" />
                            </Link>
                        )}

                        {/* User Area */}
                        {isAuthenticated && user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 sm:gap-3 p-1 pr-2 sm:pr-3 rounded-xl hover:bg-[var(--surface-secondary)] transition-all border border-transparent hover:border-[var(--border)] group"
                                >
                                    {/* Desktop User Info */}
                                    <div className="hidden lg:block text-right">
                                        <p className="text-sm font-bold text-[var(--text-main)] leading-tight group-hover:text-[var(--primary)] transition-colors">
                                            {user.displayName}
                                        </p>
                                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 leading-none">
                                                HSK {user.targetHsk}
                                            </span>
                                            {user.isPremium && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-bold text-[var(--primary)] leading-none">
                                                    PREMIUM
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-lg border-2 border-[var(--surface)] shadow-sm group-hover:shadow-md transition-all overflow-hidden">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            (user.displayName || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <Icon name="expand_more" className="text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors" />
                                </button>

                                {/* Dropdown Menu */}
                                {userMenuOpen && (
                                    <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] sm:w-[320px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        {/* Dropdown Header */}
                                        <div className="p-5 border-b border-[var(--border)] bg-[var(--surface-secondary)] relative">
                                            {/* Decoration */}
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-orange-500"></div>

                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-2xl border-4 border-[var(--surface)] shadow-md overflow-hidden">
                                                    {user.avatarUrl ? (
                                                        <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (user.displayName || '?').charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-bold text-[var(--text-main)] truncate">{user.displayName}</p>
                                                    <p className="text-xs text-[var(--text-secondary)] truncate mb-2">{user.email}</p>
                                                    <div className="flex gap-2">
                                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500">
                                                            HSK {user.targetHsk}
                                                        </span>
                                                        {user.isPremium && (
                                                            <span className="px-2 py-0.5 rounded-md bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-bold text-[var(--primary)]">
                                                                PREMIUM
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Stats */}
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <div className="bg-[var(--background)] rounded-xl p-3 text-center border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                                                    <span className="block text-xl font-bold text-[var(--text-main)]">{user.currentStreak || 0}</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Ngày liên tiếp</span>
                                                </div>
                                                <div className="bg-[var(--background)] rounded-xl p-3 text-center border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                                                    <span className="block text-xl font-bold text-[var(--text-main)]">{user.totalXp || 0}</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">XP Tích lũy</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-2 flex flex-col gap-1">
                                            <Link
                                                href="/profile"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-main)] hover:bg-[var(--surface-secondary)] transition-all group"
                                            >
                                                <Icon name="person" className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                                Hồ sơ cá nhân
                                                <Icon name="chevron_right" size="sm" className="ml-auto text-[var(--text-muted)]" />
                                            </Link>

                                            <Link
                                                href="/progress"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-main)] hover:bg-[var(--surface-secondary)] transition-all group"
                                            >
                                                <Icon name="bar_chart" className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                                Tiến độ học tập
                                                <Icon name="chevron_right" size="sm" className="ml-auto text-[var(--text-muted)]" />
                                            </Link>

                                            <div className="h-px bg-[var(--border)] my-1 mx-2 opacity-50"></div>

                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setUserMenuOpen(false);
                                                }}
                                                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all group"
                                            >
                                                <Icon name="logout" className="text-red-400 group-hover:text-red-500 transition-colors" />
                                                Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Guest Action
                            <div className="flex items-center gap-2 sm:gap-4">
                                <Link
                                    href="/register"
                                    className="hidden sm:block text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
                                >
                                    Đăng ký
                                </Link>
                                <Link
                                    href="/login"
                                    className="flex items-center justify-center h-10 px-5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] active:scale-95 transition-all text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--primary)]/25"
                                >
                                    Đăng nhập
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text-main)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <Icon name={mobileMenuOpen ? 'close' : 'menu'} />
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <nav className="md:hidden py-4 border-t border-[var(--border)] animate-in slide-in-from-top-2">
                        {navItems.map(item => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${isActive
                                        ? 'text-[var(--primary)] bg-[var(--primary)]/5'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)]'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Icon name={item.icon} className={isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>
        </header>
    );
}
