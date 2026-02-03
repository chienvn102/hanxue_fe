'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface Admin {
    id: number;
    username: string;
    role: 'super_admin' | 'editor';
}

interface AdminAuthContextType {
    admin: Admin | null;
    token: string | null;
    login: (token: string, admin: Admin) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Load admin auth data from localStorage on mount
        const storedToken = localStorage.getItem('adminToken');
        const storedAdmin = localStorage.getItem('adminUser');

        if (storedToken && storedAdmin) {
            try {
                setToken(storedToken);
                setAdmin(JSON.parse(storedAdmin));
            } catch (e) {
                console.error('Failed to parse admin data:', e);
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
            }
        }
        setLoading(false);
    }, []);

    const login = (newToken: string, newAdmin: Admin) => {
        setToken(newToken);
        setAdmin(newAdmin);

        localStorage.setItem('adminToken', newToken);
        localStorage.setItem('adminUser', JSON.stringify(newAdmin));

        router.push('/admin/dashboard');
    };

    const logout = () => {
        setToken(null);
        setAdmin(null);

        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');

        router.push('/admin/login');
    };

    return (
        <AdminAuthContext.Provider value={{ admin, token, login, logout, isAuthenticated: !!token, loading }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
}
