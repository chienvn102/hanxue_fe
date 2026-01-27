'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { login as apiLogin } from '@/lib/api';
import AuthLayout, { AuthInput } from '@/components/AuthLayout';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await apiLogin(email, password);

            // Use AuthContext to login and update state immediately
            login(data.accessToken, data.refreshToken, data.user);

            router.push('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Đăng nhập"
            subtitle="Chào mừng trở lại với HanXue"
            showRightTopLink={{
                text: "Chưa có tài khoản?",
                linkText: "Đăng ký free",
                href: "/register"
            }}
        >
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-[var(--text-main)] mb-2">Đăng Nhập</h2>
                <p className="text-[var(--text-secondary)]">Nhập thông tin tài khoản của bạn để tiếp tục.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                    <Icon name="error" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <AuthInput
                    label="Email"
                    icon="mail"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <div className="space-y-1">
                    <AuthInput
                        label="Mật khẩu"
                        icon="lock"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        rightElement={
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="hover:text-[var(--primary)] transition-colors"
                            >
                                <Icon name={showPassword ? "visibility_off" : "visibility"} size="sm" />
                            </button>
                        }
                    />
                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-xs font-medium text-[var(--primary)] hover:underline">
                            Quên mật khẩu?
                        </Link>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Đăng Nhập'
                        )}
                    </button>
                </div>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border)]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[var(--background)] text-[var(--text-secondary)] font-medium">Hoặc</span>
                </div>
            </div>

            <button
                type="button"
                className="w-full py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] font-semibold hover:bg-[var(--surface-secondary)] transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
                onClick={() => alert('Tính năng đăng nhập Google đang được phát triển!')}
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Tiếp tục với Google
            </button>
        </AuthLayout>
    );
}
