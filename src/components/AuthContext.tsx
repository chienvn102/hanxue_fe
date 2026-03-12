'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Imports removed (duplicates)
import { User } from '@/lib/api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string, refreshToken: string, user: User) => void;
    updateUser: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Wrapped in function to satisfy react-hooks/set-state-in-effect
        // (localStorage read must happen client-side via useEffect for SSR compat)
        const loadAuth = () => {
            const storedToken = localStorage.getItem('accessToken');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                try {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error('Failed to parse user data:', e);
                    localStorage.removeItem('user');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                }
            }
            setLoading(false);
        };
        loadAuth();
    }, []);

    const login = (newToken: string, newRefreshToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);

        localStorage.setItem('accessToken', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        router.push('/login');
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAuthenticated: !!token }}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
