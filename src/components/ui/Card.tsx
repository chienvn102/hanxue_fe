import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
};

export function Card({
    children,
    hover = true,
    padding = 'md',
    className = '',
    ...props
}: CardProps) {
    return (
        <div
            className={`
                bg-[var(--surface)] rounded-2xl border border-[var(--border)]
                transition-all duration-300
                ${hover ? 'hover:border-[var(--primary)]/50 hover:shadow-lg hover:shadow-[var(--primary)]/5 cursor-pointer' : ''}
                ${paddingClasses[padding]}
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
}
