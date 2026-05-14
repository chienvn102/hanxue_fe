'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout, { AuthInput } from '@/components/AuthLayout';
import { useAuth } from '@/components/AuthContext';
import { completeOnboarding, sendPasswordChangeCode } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';

export default function OnboardingPage() {
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const initialForm = useMemo(() => ({
        displayName: user?.displayName || '',
        targetHsk: String(user?.targetHsk || 1),
        nativeLanguage: user?.nativeLanguage || 'vn',
        dailyGoalMins: String(user?.dailyGoalMins || 15),
        preferredVoice: user?.preferredVoice || 'female',
        newPassword: '',
        confirmPassword: '',
        code: ''
    }), [user]);

    const [form, setForm] = useState(initialForm);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (!user) {
            router.replace('/login');
            return;
        }

        if (!user.requiresOnboarding) {
            router.replace('/profile');
        }
    }, [router, user]);

    const updateField = (field: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSendCode = async () => {
        setError('');
        setMessage('');
        setSendingCode(true);

        try {
            await sendPasswordChangeCode();
            setMessage('Mã xác nhận đã được gửi về email của bạn.');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không gửi được mã xác nhận');
        } finally {
            setSendingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (form.newPassword !== form.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }

        setLoading(true);

        try {
            const updatedUser = await completeOnboarding({
                displayName: form.displayName,
                targetHsk: Number(form.targetHsk),
                nativeLanguage: form.nativeLanguage,
                dailyGoalMins: Number(form.dailyGoalMins),
                preferredVoice: form.preferredVoice as 'male' | 'female',
                newPassword: form.newPassword,
                code: form.code
            });
            updateUser(updatedUser);
            router.push('/profile');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không hoàn tất được thiết lập tài khoản');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <AuthLayout
            title="Thiết lập tài khoản"
            subtitle="Hoàn tất hồ sơ HanXue"
        >
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-[var(--text-main)] mb-2">Thiết Lập Tài Khoản</h2>
                <p className="text-[var(--text-secondary)]">Cập nhật hồ sơ và đặt mật khẩu để bảo vệ tài khoản của bạn.</p>
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

            <form onSubmit={handleSubmit} className="space-y-5">
                <AuthInput
                    label="Tên hiển thị"
                    icon="person"
                    value={form.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                        <span className="text-sm font-semibold text-[var(--text-main)]">HSK mục tiêu</span>
                        <select
                            value={form.targetHsk}
                            onChange={(e) => updateField('targetHsk', e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] font-medium"
                        >
                            {[1, 2, 3, 4, 5, 6].map((level) => (
                                <option key={level} value={level}>HSK {level}</option>
                            ))}
                        </select>
                    </label>

                    <AuthInput
                        label="Mục tiêu mỗi ngày"
                        icon="schedule"
                        type="number"
                        min={1}
                        max={600}
                        value={form.dailyGoalMins}
                        onChange={(e) => updateField('dailyGoalMins', e.target.value)}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AuthInput
                        label="Ngôn ngữ mẹ đẻ"
                        icon="language"
                        value={form.nativeLanguage}
                        onChange={(e) => updateField('nativeLanguage', e.target.value)}
                        required
                    />

                    <label className="space-y-1.5">
                        <span className="text-sm font-semibold text-[var(--text-main)]">Giọng đọc ưa thích</span>
                        <select
                            value={form.preferredVoice}
                            onChange={(e) => updateField('preferredVoice', e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] font-medium"
                        >
                            <option value="female">Nữ</option>
                            <option value="male">Nam</option>
                        </select>
                    </label>
                </div>

                <AuthInput
                    label="Mật khẩu mới"
                    icon="lock"
                    type={showPassword ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={(e) => updateField('newPassword', e.target.value)}
                    minLength={6}
                    required
                    rightElement={
                        <button type="button" onClick={() => setShowPassword(!showPassword)}>
                            <Icon name={showPassword ? 'visibility_off' : 'visibility'} size="sm" />
                        </button>
                    }
                />

                <AuthInput
                    label="Nhập lại mật khẩu"
                    icon="lock"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    minLength={6}
                    required
                    rightElement={
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} size="sm" />
                        </button>
                    }
                />

                <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                    <AuthInput
                        label="Mã xác nhận email"
                        icon="pin"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={form.code}
                        onChange={(e) => updateField('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                    />
                    <button
                        type="button"
                        disabled={sendingCode}
                        onClick={handleSendCode}
                        className="h-[46px] px-4 rounded-xl border border-[var(--border)] font-semibold text-sm hover:bg-[var(--surface-secondary)] disabled:opacity-60"
                    >
                        {sendingCode ? 'Đang gửi' : 'Gửi mã'}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Hoàn Tất'
                    )}
                </button>
            </form>
        </AuthLayout>
    );
}
