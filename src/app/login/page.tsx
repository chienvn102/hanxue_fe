'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/components/AuthContext';
import { googleLogin, login as apiLogin } from '@/lib/api';
import AuthLayout, { AuthInput } from '@/components/AuthLayout';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleGoogleCredential = useCallback(async (credential: string) => {
        setError('');
        setLoading(true);

        try {
            const data = await googleLogin(credential);
            login(data.accessToken, data.refreshToken, data.user);
            router.push('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại');
        } finally {
            setLoading(false);
        }
    }, [login, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await apiLogin(email, password);
            login(data.accessToken, data.refreshToken, data.user);
            router.push('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Đăng nhập"
            subtitle="Chào mừng trở lại với HanXue"
            showRightTopLink={{
                text: 'Chưa có tài khoản?',
                linkText: 'Đăng ký free',
                href: '/register'
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
                        type={showPassword ? 'text' : 'password'}
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
                                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size="sm" />
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

            <GoogleLoginButton
                disabled={loading}
                onCredential={handleGoogleCredential}
                onError={setError}
            />
        </AuthLayout>
    );
}
