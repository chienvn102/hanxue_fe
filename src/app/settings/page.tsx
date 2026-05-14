'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/components/AuthContext';
import {
    changePassword,
    fetchProfile,
    ProfileUpdatePayload,
    sendPasswordChangeCode,
    updateProfile
} from '@/lib/api';
import { Icon } from '@/components/ui/Icon';

type SettingsTab = 'profile' | 'security';

export default function SettingsPage() {
    const { user, updateUser, logout } = useAuth();
    const router = useRouter();
    const userId = user?.id;
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [profileForm, setProfileForm] = useState({
        displayName: user?.displayName || '',
        avatarUrl: user?.avatarUrl || '',
        targetHsk: String(user?.targetHsk || 1),
        nativeLanguage: user?.nativeLanguage || 'vn',
        dailyGoalMins: String(user?.dailyGoalMins || 15),
        preferredVoice: user?.preferredVoice || 'female'
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        code: ''
    });
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const inputClass = 'w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--foreground)] px-4 py-3 outline-none font-medium focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]';

    useEffect(() => {
        if (!userId) {
            router.replace('/login');
            return;
        }

        let cancelled = false;

        fetchProfile()
            .then((profile) => {
                if (cancelled) return;

                updateUser(profile);
                setProfileForm({
                    displayName: profile.displayName || '',
                    avatarUrl: profile.avatarUrl || '',
                    targetHsk: String(profile.targetHsk || 1),
                    nativeLanguage: profile.nativeLanguage || 'vn',
                    dailyGoalMins: String(profile.dailyGoalMins || 15),
                    preferredVoice: profile.preferredVoice || 'female'
                });
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Không tải được hồ sơ');
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingProfile(false);
            });

        return () => {
            cancelled = true;
        };
    }, [router, updateUser, userId]);

    const updateProfileField = (field: keyof typeof profileForm, value: string) => {
        setProfileForm((current) => ({ ...current, [field]: value }));
    };

    const updatePasswordField = (field: keyof typeof passwordForm, value: string) => {
        setPasswordForm((current) => ({ ...current, [field]: value }));
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setSavingProfile(true);

        try {
            const payload: ProfileUpdatePayload = {
                displayName: profileForm.displayName,
                avatarUrl: profileForm.avatarUrl || null,
                targetHsk: Number(profileForm.targetHsk),
                nativeLanguage: profileForm.nativeLanguage,
                dailyGoalMins: Number(profileForm.dailyGoalMins),
                preferredVoice: profileForm.preferredVoice as 'male' | 'female'
            };
            const updated = await updateProfile(payload);
            updateUser(updated);
            setMessage('Đã lưu thông tin cá nhân.');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không lưu được thông tin cá nhân');
        } finally {
            setSavingProfile(false);
        }
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }

        setSavingPassword(true);

        try {
            await changePassword({
                currentPassword: user?.hasPassword ? passwordForm.currentPassword : undefined,
                newPassword: passwordForm.newPassword,
                code: passwordForm.code
            });
            setMessage('Mật khẩu đã được đổi. Vui lòng đăng nhập lại.');
            setTimeout(() => {
                logout();
            }, 1200);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không đổi được mật khẩu');
        } finally {
            setSavingPassword(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-main)]">
            <Header />

            <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Cài đặt tài khoản</h1>
                    <p className="text-[var(--text-secondary)]">Quản lý hồ sơ học tập và bảo mật đăng nhập.</p>
                </div>

                <div className="flex gap-2 border-b border-[var(--border)] mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'profile'
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                            }`}
                    >
                        Thông tin cá nhân
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'security'
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                            }`}
                    >
                        Bảo mật
                    </button>
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

                {activeTab === 'profile' ? (
                    <form onSubmit={handleSaveProfile} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
                        {loadingProfile ? (
                            <div className="py-16 flex justify-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Tên hiển thị">
                                        <input
                                            value={profileForm.displayName}
                                            onChange={(e) => updateProfileField('displayName', e.target.value)}
                                            className={inputClass}
                                            required
                                        />
                                    </Field>

                                    <Field label="Avatar URL">
                                        <input
                                            value={profileForm.avatarUrl}
                                            onChange={(e) => updateProfileField('avatarUrl', e.target.value)}
                                            className={inputClass}
                                            placeholder="https://..."
                                        />
                                    </Field>

                                    <Field label="HSK mục tiêu">
                                        <select
                                            value={profileForm.targetHsk}
                                            onChange={(e) => updateProfileField('targetHsk', e.target.value)}
                                            className={inputClass}
                                        >
                                            {[1, 2, 3, 4, 5, 6].map((level) => (
                                                <option key={level} value={level}>HSK {level}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Ngôn ngữ mẹ đẻ">
                                        <input
                                            value={profileForm.nativeLanguage}
                                            onChange={(e) => updateProfileField('nativeLanguage', e.target.value)}
                                            className={inputClass}
                                            required
                                        />
                                    </Field>

                                    <Field label="Mục tiêu mỗi ngày">
                                        <input
                                            type="number"
                                            min={1}
                                            max={600}
                                            value={profileForm.dailyGoalMins}
                                            onChange={(e) => updateProfileField('dailyGoalMins', e.target.value)}
                                            className={inputClass}
                                            required
                                        />
                                    </Field>

                                    <Field label="Giọng đọc ưa thích">
                                        <select
                                            value={profileForm.preferredVoice}
                                            onChange={(e) => updateProfileField('preferredVoice', e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="female">Nữ</option>
                                            <option value="male">Nam</option>
                                        </select>
                                    </Field>
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="px-5 py-3 rounded-xl bg-[var(--primary)] text-white font-bold hover:bg-[var(--primary-dark)] disabled:opacity-70"
                                >
                                    {savingProfile ? 'Đang lưu' : 'Lưu thay đổi'}
                                </button>
                            </>
                        )}
                    </form>
                ) : (
                    <form onSubmit={handleChangePassword} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Đổi mật khẩu</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Mỗi lần đổi mật khẩu cần mã xác nhận gửi về email.</p>
                        </div>

                        {user.hasPassword && (
                            <Field label="Mật khẩu hiện tại">
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => updatePasswordField('currentPassword', e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="Mật khẩu mới">
                                <input
                                    type="password"
                                    minLength={6}
                                    value={passwordForm.newPassword}
                                    onChange={(e) => updatePasswordField('newPassword', e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>

                            <Field label="Nhập lại mật khẩu">
                                <input
                                    type="password"
                                    minLength={6}
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => updatePasswordField('confirmPassword', e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                            <Field label="Mã xác nhận email">
                                <input
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={passwordForm.code}
                                    onChange={(e) => updatePasswordField('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className={inputClass}
                                    required
                                />
                            </Field>
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
                            disabled={savingPassword}
                            className="px-5 py-3 rounded-xl bg-[var(--primary)] text-white font-bold hover:bg-[var(--primary-dark)] disabled:opacity-70"
                        >
                            {savingPassword ? 'Đang đổi' : 'Đổi mật khẩu'}
                        </button>
                    </form>
                )}
            </main>

        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="space-y-1.5 block">
            <span className="text-sm font-semibold text-[var(--text-main)]">{label}</span>
            {children}
        </label>
    );
}
