'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';
import AuthLayout, { AuthInput } from '@/components/AuthLayout';
import { Icon } from '@/components/ui/Icon';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }

        setLoading(true);

        try {
            await register(formData.email, formData.password, formData.displayName);

            // Show success state
            setSuccess(true);

            // Redirect after short delay
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.message);
            setLoading(false); // Only stop loading on error, keep loading on success until redirect
        }
    };

    return (
        <AuthLayout
            title="Tạo tài khoản"
            subtitle="Tham gia cộng đồng học tiếng Trung"
            showRightTopLink={{
                text: "Đã có tài khoản?",
                linkText: "Đăng nhập",
                href: "/login"
            }}
        >
            {/* Success Alert */}
            {success && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white">
                        <Icon name="check" size="md" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-green-500 mb-1">Đăng ký thành công!</h4>
                        <p className="text-sm text-green-600 dark:text-green-400">Vui lòng kiểm tra email để xác thực tài khoản của bạn. Đang chuyển hướng...</p>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                    <Icon name="error" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <AuthInput
                    label="Tên hiển thị"
                    icon="person"
                    placeholder="Nhập tên hiển thị"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                />

                <AuthInput
                    label="Email"
                    icon="mail"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />

                <AuthInput
                    label="Mật khẩu"
                    icon="lock"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
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

                <AuthInput
                    label="Nhập lại mật khẩu"
                    icon="lock"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    rightElement={
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="hover:text-[var(--primary)] transition-colors"
                        >
                            <Icon name={showConfirmPassword ? "visibility_off" : "visibility"} size="sm" />
                        </button>
                    }
                />

                <button
                    type="submit"
                    disabled={loading || success}
                    className="w-full py-4 mt-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Đăng Ký'
                    )}
                </button>
            </form>

            <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                Bằng việc đăng ký, bạn đồng ý với <Link href="/terms" className="underline hover:text-[var(--primary)]">Điều khoản sử dụng</Link> và <Link href="/privacy" className="underline hover:text-[var(--primary)]">Chính sách bảo mật</Link> của HanXue.
            </p>
        </AuthLayout>
    );
}
