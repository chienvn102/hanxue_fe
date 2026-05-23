'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthContext';
import { getMediaUrl } from '@/lib/api';
import { Icon } from './ui/Icon';
import { SfxToggle } from './SfxToggle';
import { NotificationBell } from './NotificationBell';

interface NavItem {
    href: string;
    label: string;
    icon: string;
}

const PRIMARY_NAV: NavItem[] = [
    { href: '/vocab', label: 'Từ vựng', icon: 'menu_book' },
    { href: '/practice', label: 'Luyện tập', icon: 'school' },
    { href: '/courses', label: 'Khóa học', icon: 'play_circle' },
    { href: '/hsk-test', label: 'Luyện thi HSK', icon: 'quiz' },
];

const SECONDARY_NAV: NavItem[] = [
    { href: '/', label: 'Trang chủ', icon: 'home' },
    { href: '/grammar', label: 'Ngữ pháp', icon: 'auto_stories' },
    { href: '/leaderboard', label: 'Xếp hạng', icon: 'emoji_events' },
    { href: '/chat', label: 'Học cùng AI', icon: 'smart_toy' },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [exploreMenuOpen, setExploreMenuOpen] = useState(false);
    const pathname = usePathname();
    const { resolvedTheme, toggleTheme } = useTheme();
    const { user, isAuthenticated, logout } = useAuth();
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const exploreDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
                setUserMenuOpen(false);
            }
            if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(target)) {
                setExploreMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Active match: '/' chỉ exact, các route khác match cả sub-routes
    // (ví dụ /vocab/123 → highlight "Từ vựng", /practice/match → "Luyện tập").
    const isNavActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(href + '/');
    };
    const exploreActive = SECONDARY_NAV.some(item => isNavActive(item.href));

    return (
        <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4 h-16 sm:h-20">
                    {/* Logo — shrinks ở viewport hẹp để không đè nav */}
                    <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
                        <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 group-hover:scale-105 transition-transform duration-300">
                            <Icon name="translate" size="md" />
                        </div>
                        <h1 className="hidden sm:block text-xl font-bold tracking-tight text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                            HanXue
                        </h1>
                    </Link>

                    {/* Desktop Nav: 4 primary + Khám phá dropdown */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {PRIMARY_NAV.map(item => {
                            const isActive = isNavActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-3 xl:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${isActive
                                        ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)]'
                                        }`}
                                >
                                    {isActive && <Icon name={item.icon} size="sm" className="fill-current" />}
                                    {item.label}
                                </Link>
                            );
                        })}

                        {/* Khám phá dropdown */}
                        <div className="relative" ref={exploreDropdownRef}>
                            <button
                                onClick={() => setExploreMenuOpen(o => !o)}
                                className={`px-3 xl:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${exploreActive
                                    ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-secondary)]'
                                    }`}
                            >
                                Khám phá
                                <Icon name={exploreMenuOpen ? 'expand_less' : 'expand_more'} size="sm" />
                            </button>
                            {exploreMenuOpen && (
                                <div className="absolute left-0 top-[calc(100%+8px)] w-56 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-50 p-2">
                                    {SECONDARY_NAV.map(item => {
                                        const isActive = isNavActive(item.href);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setExploreMenuOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                                    ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                                                    : 'text-[var(--text-main)] hover:bg-[var(--surface-secondary)]'
                                                    }`}
                                            >
                                                <Icon name={item.icon} size="sm" className={isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'} />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Theme Toggle */}
                        <button
                            onClick={(e) => toggleTheme(e)}
                            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)] transition-colors"
                            title={resolvedTheme === 'dark' ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
                        >
                            <Icon name={resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'} />
                        </button>

                        {/* SFX Toggle */}
                        <SfxToggle className="hidden sm:inline-flex w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-xl" />

                        {/* Notifications */}
                        <NotificationBell />

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
                            <div className="relative" ref={userDropdownRef}>
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 p-1 sm:pr-2 rounded-xl hover:bg-[var(--surface-secondary)] transition-all border border-transparent hover:border-[var(--border)] group"
                                >
                                    {/* Desktop User Info — chỉ hiện ở xl+ để nhường chỗ nav */}
                                    <div className="hidden xl:block text-right pr-1">
                                        <p className="text-sm font-bold text-[var(--text-main)] leading-tight group-hover:text-[var(--primary)] transition-colors max-w-[140px] truncate">
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
                                            <img src={getMediaUrl(user.avatarUrl)} alt={user.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            (user.displayName || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <Icon name="expand_more" size="sm" className="text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors" />
                                </button>

                                {/* Dropdown Menu */}
                                {userMenuOpen && (
                                    <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] sm:w-[320px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        {/* Dropdown Header */}
                                        <div className="p-5 border-b border-[var(--border)] bg-[var(--surface-secondary)] relative">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-orange-500"></div>

                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-2xl border-4 border-[var(--surface)] shadow-md overflow-hidden">
                                                    {user.avatarUrl ? (
                                                        <img src={getMediaUrl(user.avatarUrl)} alt={user.displayName} className="w-full h-full object-cover" />
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
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Link
                                    href="/register"
                                    className="hidden sm:block text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
                                >
                                    Đăng ký
                                </Link>
                                <Link
                                    href="/login"
                                    className="flex items-center justify-center h-10 px-4 sm:px-5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] active:scale-95 transition-all text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--primary)]/25"
                                >
                                    Đăng nhập
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text-main)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <Icon name={mobileMenuOpen ? 'close' : 'menu'} />
                        </button>
                    </div>
                </div>

                {/* Mobile Nav: full list (primary + secondary) */}
                {mobileMenuOpen && (
                    <nav className="lg:hidden py-4 border-t border-[var(--border)] animate-in slide-in-from-top-2">
                        {ALL_NAV.map(item => {
                            const isActive = isNavActive(item.href);
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
