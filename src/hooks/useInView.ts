'use client';

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
    /** Phần diện tích phải lọt viewport mới trigger (0–1). */
    threshold?: number;
    /** Margin mở rộng/thu hẹp vùng quan sát (CSS rootMargin). */
    rootMargin?: string;
    /** Chỉ reveal 1 lần rồi ngừng quan sát (mặc định true). */
    once?: boolean;
}

/**
 * Scroll-reveal hook: trả về ref + cờ `inView`. Gắn ref vào phần tử có class
 * `reveal`, rồi toggle `is-visible` theo `inView` để chạy animation transform/opacity.
 *
 * An toàn SSR: chỉ chạy observer ở client. Nếu trình duyệt không hỗ trợ
 * IntersectionObserver → coi như hiện luôn (inView = true) để không ẩn nội dung.
 */
export function useInView<T extends Element = HTMLDivElement>(
    { threshold = 0.12, rootMargin = '0px 0px -8% 0px', once = true }: UseInViewOptions = {},
) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setInView(true);
                        if (once) observer.unobserve(entry.target);
                    } else if (!once) {
                        setInView(false);
                    }
                });
            },
            { threshold, rootMargin },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return { ref, inView };
}
