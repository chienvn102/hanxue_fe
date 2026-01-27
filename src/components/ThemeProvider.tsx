'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: (event?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: () => { },
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    // Get system preference
    const getSystemTheme = (): 'light' | 'dark' => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    // Resolve theme
    const resolveTheme = (t: Theme): 'light' | 'dark' => {
        if (t === 'system') {
            return getSystemTheme();
        }
        return t;
    };

    // Apply theme to document
    const applyTheme = (resolved: 'light' | 'dark') => {
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
            setResolvedTheme(resolved);
        }
    };

    // Initialize theme from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('hanxue-theme') as Theme | null;
        const initialTheme = stored || 'system';
        setThemeState(initialTheme);
        applyTheme(resolveTheme(initialTheme));

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                applyTheme(getSystemTheme());
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Update theme when state changes
    useEffect(() => {
        localStorage.setItem('hanxue-theme', theme);
        applyTheme(resolveTheme(theme));
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const toggleTheme = (event?: React.MouseEvent) => {
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

        // Use View Transition API if supported
        if ('startViewTransition' in document && event) {
            const x = event.clientX;
            const y = event.clientY;
            const endRadius = Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
            );

            // @ts-ignore - startViewTransition is not in TypeScript types yet
            const transition = document.startViewTransition(() => {
                setThemeState(newTheme);
            });

            transition.ready.then(() => {
                // Always animate new view expanding from click point
                document.documentElement.animate(
                    {
                        clipPath: [
                            `circle(0px at ${x}px ${y}px)`,
                            `circle(${endRadius}px at ${x}px ${y}px)`
                        ]
                    },
                    {
                        duration: 400,
                        easing: 'ease-out',
                        pseudoElement: '::view-transition-new(root)'
                    }
                );
            });
        } else {
            // Fallback: direct switch
            setThemeState(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
