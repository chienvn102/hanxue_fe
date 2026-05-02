'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type HskTestMode = 'practice' | 'full';

interface HskTestCtx {
    showPinyin: boolean;
    setShowPinyin: (v: boolean) => void;
    /**
     * 'practice' — replay không giới hạn, audio inline mỗi câu.
     * 'full' — full test mode: audio merged toàn section ở đầu, tự phát 1 lần,
     * lock seek; audio inline per-câu bị ẩn để tránh trùng.
     */
    testMode: HskTestMode;
}

const Ctx = createContext<HskTestCtx | null>(null);

const STORAGE_KEY = 'hsk-test:showPinyin';

interface ProviderProps {
    children: ReactNode;
    defaultShowPinyin?: boolean;
    testMode?: HskTestMode;
}

export function HskTestProvider({
    children,
    defaultShowPinyin = true,
    testMode = 'practice',
}: ProviderProps) {
    const [showPinyin, setShowPinyinState] = useState(defaultShowPinyin);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) setShowPinyinState(stored === '1');
    }, []);

    const setShowPinyin = (v: boolean) => {
        setShowPinyinState(v);
        localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    };

    return (
        <Ctx.Provider value={{ showPinyin, setShowPinyin, testMode }}>
            {children}
        </Ctx.Provider>
    );
}

export function useHskTest() {
    const v = useContext(Ctx);
    if (!v) throw new Error('useHskTest must be inside HskTestProvider');
    return v;
}
