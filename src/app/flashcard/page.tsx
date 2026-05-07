'use client';

// Trang setup flashcard cũ đã được thay bằng /practice (hub đa game).
// Giữ file này làm redirect để bookmark/link cũ vẫn hoạt động.
// /flashcard/session vẫn được nhiều route khác trỏ tới — KHÔNG redirect.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FlashcardLandingRedirectPage() {
    const router = useRouter();
    useEffect(() => { router.replace('/practice'); }, [router]);
    return (
        <div className="min-h-screen flex items-center justify-center" role="status" aria-busy="true">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
            <span className="sr-only">Đang chuyển sang trang Luyện tập...</span>
        </div>
    );
}
