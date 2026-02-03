import { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
    fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary-light)]',
    secondary: 'bg-[var(--surface)] text-[var(--text-main)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] hover:border-[var(--border-hover)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)]',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'bg-transparent border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface-secondary)] hover:border-[var(--border-hover)]',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
};

export function Button({
    variant = 'primary',
    size = 'md',
    children,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
                inline-flex items-center justify-center gap-2 font-semibold
                transition-all duration-200 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
