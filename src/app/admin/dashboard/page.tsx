'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/components/AdminAuthContext';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Stats {
    userCount: number;
    courseCount: number;
    lessonCount: number;
    vocabCount: number;
    grammarCount: number;
    examCount: number;
}

export default function AdminDashboardPage() {
    const { token } = useAdminAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) fetchStats();
    }, [token]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'Tổng thành viên', value: stats?.userCount ?? 0, icon: 'group', color: 'text-blue-600 bg-blue-50' },
        { label: 'Khóa học', value: stats?.courseCount ?? 0, icon: 'school', color: 'text-purple-600 bg-purple-50' },
        { label: 'Bài học', value: stats?.lessonCount ?? 0, icon: 'play_circle', color: 'text-green-600 bg-green-50' },
        { label: 'Từ vựng', value: stats?.vocabCount ?? 0, icon: 'translate', color: 'text-orange-600 bg-orange-50' },
        { label: 'Ngữ pháp', value: stats?.grammarCount ?? 0, icon: 'text_snippet', color: 'text-teal-600 bg-teal-50' },
        { label: 'Đề thi HSK', value: stats?.examCount ?? 0, icon: 'quiz', color: 'text-red-600 bg-red-50' },
    ];

    const quickActions = [
        { label: 'Quản lý Khóa học', icon: 'school', href: '/admin/courses', desc: 'Thêm, sửa, xóa khóa học' },
        { label: 'Quản lý Từ vựng', icon: 'translate', href: '/admin/vocabulary', desc: 'CRUD từ vựng HSK' },
        { label: 'Quản lý Ngữ pháp', icon: 'text_snippet', href: '/admin/grammar', desc: 'CRUD điểm ngữ pháp' },
        { label: 'Quản lý Đề thi', icon: 'quiz', href: '/admin/hsk-test', desc: 'Tạo và quản lý đề thi' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Hệ thống hoạt động tốt
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {statCards.map(card => (
                    <div key={card.label} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                            <Icon name={card.icon} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{card.label}</p>
                            {loading ? (
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Truy cập nhanh</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {quickActions.map(action => (
                    <Link
                        key={action.href}
                        href={action.href}
                        className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[var(--primary)]/30 transition-all group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Icon name={action.icon} className="text-gray-400 group-hover:text-[var(--primary)] transition-colors" />
                            <span className="font-semibold text-gray-900 group-hover:text-[var(--primary)] transition-colors">{action.label}</span>
                        </div>
                        <p className="text-sm text-gray-500">{action.desc}</p>
                    </Link>
                ))}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Hoạt động gần đây</h2>
                <div className="text-gray-500 text-center py-10">
                    <Icon name="history" size="lg" className="text-gray-300 mb-2" />
                    <p>Chưa có hoạt động nào.</p>
                </div>
            </div>
        </div>
    );
}
