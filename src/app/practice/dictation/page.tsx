'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function DictationRedirect() {
    const params = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const next = new URLSearchParams();
        next.set('hsk', params.get('hsk') || '1');
        next.set('limit', params.get('limit') || '20');
        next.set('mode', 'listen');
        router.replace(`/flashcard/session?${next.toString()}`);
    }, [params, router]);

    return (
        <div className="min-h-screen flex items-center justify-center" role="status" aria-busy="true">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
            <span className="sr-only">Đang vào nghe viết...</span>
        </div>
    );
}

export default function PracticeDictationPage() {
    return (
        <Suspense fallback={null}>
            <DictationRedirect />
        </Suspense>
    );
}
