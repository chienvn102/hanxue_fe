'use client';

// Tạm thời: redirect sang /flashcard/session đã có sẵn (mode=choice).
// Sau này khi build true flip-card UI riêng cho /practice/flashcard,
// thay redirect bằng implementation thật.

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function FlashcardRedirect() {
    const params = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const next = new URLSearchParams();
        next.set('hsk', params.get('hsk') || '1');
        next.set('limit', params.get('limit') || '20');
        next.set('mode', 'choice');
        router.replace(`/flashcard/session?${next.toString()}`);
    }, [params, router]);

    return (
        <div className="min-h-screen flex items-center justify-center" role="status" aria-busy="true">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
            <span className="sr-only">Đang vào game flashcard...</span>
        </div>
    );
}

export default function PracticeFlashcardPage() {
    return (
        <Suspense fallback={null}>
            <FlashcardRedirect />
        </Suspense>
    );
}
