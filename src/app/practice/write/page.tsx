'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function PracticeWritePage() {
    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <Icon name="draw" size="xl" className="text-orange-500 mb-3" />
                <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Viết chữ — đang phát triển</h1>
                <p className="text-[var(--text-secondary)] max-w-md mb-6">
                    Game vẽ Hán theo nét sẽ ra mắt trong bản kế tiếp. Stroke order canvas
                    có sẵn ở từng từ trong thư viện từ vựng — vào trang chi tiết từ để tập viết tạm.
                </p>
                <Link href="/practice"><Button>← Về trang Luyện tập</Button></Link>
            </main>
            <Footer />
        </div>
    );
}
