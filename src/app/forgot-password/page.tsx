'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout, { AuthInput } from '@/components/AuthLayout';
import { Icon } from '@/components/ui/Icon';
import { requestPasswordReset, resetPassword } from '@/lib/api';

type Step = 'request' | 'reset';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>('request');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await requestPasswordReset(email);
            setMessage('Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.');
            setStep('reset');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không gửi được mã đặt lại mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }

        if (newPassword.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);

        try {
            await resetPassword(email, code, newPassword);
            setMessage('Mật khẩu đã được đặt lại. Đang chuyển về trang đăng nhập...');
            setTimeout(() => {
                router.push('/login');
            }, 1600);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không đặt lại được mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Quên mật khẩu"
            subtitle="Nhận mã xác minh qua email"
            showRightTopLink={{
                text: 'Đã nhớ mật khẩu?',
                linkText: 'Đăng nhập',
                href: '/login'
            }}
        >
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-[var(--text-main)] mb-2">Quên Mật Khẩu</h2>
                <p className="text-[var(--text-secondary)]">
                    {step === 'request'
                        ? 'Nhập email tài khoản để nhận mã đặt lại mật khẩu.'
                        : 'Nhập mã 6 số trong email và mật khẩu mới của bạn.'}
                </p>
            </div>

            {message && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3 text-green-600 dark:text-green-400 text-sm">
                    <Icon name="check_circle" />
                    <span>{message}</span>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                    <Icon name="error" />
                    {error}
                </div>
            )}

            {step === 'request' ? (
                <form onSubmit={handleRequestCode} className="space-y-5">
                    <AuthInput
                        label="Email"
                        icon="mail"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Gửi Mã'
                        )}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                    <AuthInput
                        label="Email"
                        icon="mail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <AuthInput
                        label="Mã xác minh"
                        icon="pin"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                    />

                    <AuthInput
                        label="Mật khẩu mới"
                        icon="lock"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
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

                    <AuthInput
                        label="Nhập lại mật khẩu"
                        icon="lock"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        rightElement={
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="hover:text-[var(--primary)] transition-colors"
                            >
                                <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} size="sm" />
                            </button>
                        }
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Đặt Lại Mật Khẩu'
                        )}
                    </button>

                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => setStep('request')}
                            className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                            Gửi lại mã
                        </button>
                    </div>
                </form>
            )}

            <div className="pt-2 text-center">
                <Link href="/login" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]">
                    Quay lại đăng nhập
                </Link>
            </div>
        </AuthLayout>
    );
}
