'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function PracticeTranslatePage() {
    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <Icon name="translate" size="xl" className="text-indigo-500 mb-3" />
                <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Dịch câu — đang phát triển</h1>
                <p className="text-[var(--text-secondary)] max-w-md mb-6">
                    Game dịch câu Việt ↔ Trung sẽ ra mắt khi pipeline câu mẫu sẵn sàng.
                </p>
                <Link href="/practice"><Button>← Về trang Luyện tập</Button></Link>
            </main>
            <Footer />
        </div>
    );
}
