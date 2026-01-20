'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { Icon } from './ui/Icon';

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const { resolvedTheme, toggleTheme } = useTheme();

    const navItems = [
        { href: '/', label: 'Trang chủ' },
        { href: '/vocab', label: 'Từ vựng' },
        { href: '/flashcard', label: 'Luyện tập' },
        { href: '/search', label: 'Tra cứu' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)] text-white">
                            <Icon name="translate" size="md" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)]">
                            HanXue
                        </h1>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-sm font-medium transition-colors ${pathname === item.href
                                        ? 'text-[var(--primary)]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                            title={resolvedTheme === 'dark' ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
                        >
                            <Icon name={resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'} />
                        </button>

                        {/* User Avatar */}
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-xs font-semibold text-[var(--text-main)]">Khách</span>
                            <span className="text-[10px] text-[var(--text-secondary)]">Đăng nhập</span>
                        </div>
                        <button className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer">
                            <Icon name="person" size="md" />
                        </button>

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-[var(--text-main)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <Icon name={mobileMenuOpen ? 'close' : 'menu'} />
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <nav className="md:hidden py-4 border-t border-[var(--border)]">
                        {navItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block py-3 text-sm font-medium transition-colors ${pathname === item.href
                                        ? 'text-[var(--primary)]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
                                    }`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </div>
        </header>
    );
}
