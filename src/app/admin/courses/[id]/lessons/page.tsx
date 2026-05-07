'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Trang cũ này được giữ làm redirect để tương thích với link bên ngoài /
// bookmark đã có. Quản lý lesson chuyển sang `/admin/courses/[id]` (tab Lessons).
export default function AdminLessonsRedirectPage() {
    const params = useParams();
    const router = useRouter();
    useEffect(() => {
        router.replace(`/admin/courses/${params.id}`);
    }, [params.id, router]);
    return (
        <div className="flex items-center justify-center py-20" role="status" aria-busy="true">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]"></div>
            <span className="sr-only">Đang chuyển hướng...</span>
        </div>
    );
}
