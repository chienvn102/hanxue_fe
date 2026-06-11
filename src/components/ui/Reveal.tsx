'use client';

import { type ElementType, type ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';

interface RevealProps {
    children: ReactNode;
    /** Thẻ bao ngoài (mặc định div). Dùng 'section'/'li'… khi cần semantic. */
    as?: ElementType;
    /** Thứ tự trong nhóm để stagger (delay = index * 55ms). */
    index?: number;
    className?: string;
    /** Reveal lại mỗi lần cuộn vào (mặc định 1 lần). */
    repeat?: boolean;
}

/**
 * Bọc nội dung bằng scroll-reveal (opacity + translateY). KHÔNG đổi layout:
 * phần tử vẫn chiếm đúng chỗ, chỉ thêm chuyển động khi vào viewport. Tôn trọng
 * prefers-reduced-motion qua guard trong globals.css.
 */
export function Reveal({ children, as, index, className = '', repeat = false }: RevealProps) {
    const Tag = (as || 'div') as ElementType;
    const { ref, inView } = useInView<HTMLElement>({ once: !repeat });

    return (
        <Tag
            ref={ref}
            className={`reveal ${inView ? 'is-visible' : ''} ${className}`.trim()}
            style={index != null ? ({ ['--reveal-i']: index } as React.CSSProperties) : undefined}
        >
            {children}
        </Tag>
    );
}
