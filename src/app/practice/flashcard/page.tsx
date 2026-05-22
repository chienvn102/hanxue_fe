'use client';

// Practice → Flashcard điều hướng người dùng tới trang quản lý/tạo deck
// (đã có sẵn form tạo deck từ Notebook/HSK/Theme/Lesson). Người dùng sẽ
// chọn / tạo deck rồi vào session học.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PracticeFlashcardPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/flashcard');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center" role="status" aria-busy="true">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
            <span className="sr-only">Đang mở trang flashcard...</span>
        </div>
    );
}
