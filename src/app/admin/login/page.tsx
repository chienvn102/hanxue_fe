'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAdminAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            login(data.token, data.admin);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-orange-600 text-white mb-4 shadow-lg">
                            <Icon name="admin_panel_settings" size="lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Cổng Quản Trị</h1>
                        <p className="text-gray-500 mt-2">Đăng nhập để quản lý nội dung</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                            <Icon name="error_outline" className="text-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Icon name="person" size="sm" />
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all outline-none"
                                    placeholder="Nhập tên đăng nhập"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Icon name="lock" size="sm" />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all outline-none"
                                    placeholder="Nhập mật khẩu"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                        </Button>
                    </form>
                </div>
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                    HanXue Administration System v2.0
                </div>
            </div>
        </div>
    );
}
