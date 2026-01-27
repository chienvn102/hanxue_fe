'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Icon } from './ui/Icon';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
    showRightTopLink?: {
        text: string;
        linkText: string;
        href: string;
    };
}

export default function AuthLayout({ children, title, subtitle, showRightTopLink }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex bg-[var(--background)]">
            {/* Left Brand Panel - Always Dark/Brand colored as requested */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#1A1F2E] flex-col justify-between p-12 relative overflow-hidden">
                {/* Background decorative elements if needed */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#EF7B7B]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                {/* Logo */}
                <div className="z-10">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#EF7B7B] text-white shadow-lg shadow-[#EF7B7B]/20">
                            <Icon name="translate" size="md" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            HanXue <span className="text-[#8B95A5] font-normal text-lg ml-1">汉学</span>
                        </h1>
                    </Link>
                </div>

                {/* Hero Content */}
                <div className="z-10 max-w-lg">
                    <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                        Bắt đầu hành trình <br />
                        <span className="text-[#EF7B7B]">chinh phục tiếng Trung</span>
                    </h2>
                    <p className="text-[#8B95A5] text-lg mb-12">
                        Tạo tài khoản miễn phí để truy cập hàng ngàn bài học, flashcard và cộng đồng học tập sôi nổi.
                    </p>

                    {/* Feature Highlights */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bgwhite/5 bg-[#252B3B]/50 border border-[#3A4256] backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-[#EF7B7B]/20 flex items-center justify-center text-[#EF7B7B]">
                                <Icon name="school" size="md" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Học từ vựng theo chủ đề</h3>
                                <p className="text-[#8B95A5] text-sm">Hơn 5000+ từ vựng HSK 1-6</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#252B3B]/50 border border-[#3A4256] backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-[#7DD3C0]/20 flex items-center justify-center text-[#7DD3C0]">
                                <Icon name="chat" size="md" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Luyện giao tiếp AI</h3>
                                <p className="text-[#8B95A5] text-sm">Thực hành hội thoại tự nhiên</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Copy */}
                <div className="z-10">
                    <p className="text-[#8B95A5] text-sm">© 2024 HanXue. All rights reserved.</p>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="w-full lg:w-1/2 flex flex-col relative">
                {/* Top Navigation */}
                <div className="absolute top-0 right-0 p-6 flex items-center justify-end w-full z-20">
                    {/* Mobile Logo Only */}
                    <Link href="/" className="lg:hidden absolute left-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white">
                            <Icon name="translate" size="sm" />
                        </div>
                    </Link>

                    {showRightTopLink && (
                        <div className="text-sm font-medium">
                            <span className="text-[var(--text-secondary)] mr-2">{showRightTopLink.text}</span>
                            <Link
                                href={showRightTopLink.href}
                                className="px-4 py-2 rounded-full border border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-main)]"
                            >
                                {showRightTopLink.linkText}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Form Content */}
                <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-24 overflow-y-auto">
                    <div className="w-full max-w-md space-y-8">
                        {/* Header for Mobile/Small screens usually, but shown always as per design */}
                        {/* Actually design shows logo on top left of DARK panel. 
                            Right panel starts clean.
                        */}

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Input Component matching the design
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: string;
    rightElement?: ReactNode;
}

export function AuthInput({ label, icon, rightElement, className, ...props }: AuthInputProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--text-main)]">
                {label}
            </label>
            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors">
                        <Icon name={icon} size="sm" />
                    </div>
                )}
                <input
                    {...props}
                    className={`w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] rounded-xl py-3 ${icon ? 'pl-11' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-muted)]/50 font-medium ${className}`}
                />
                {rightElement && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-icon)]">
                        {rightElement}
                    </div>
                )}
            </div>
        </div>
    );
}
