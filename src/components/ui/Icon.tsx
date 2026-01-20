interface IconProps {
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    filled?: boolean;
}

const sizeClasses = {
    sm: 'text-[16px]',
    md: 'text-[20px]',
    lg: 'text-[24px]',
    xl: 'text-[32px]',
};

export function Icon({ name, className = '', size = 'md', filled = false }: IconProps) {
    return (
        <span
            className={`material-symbols-outlined ${filled ? 'filled' : ''} ${sizeClasses[size]} ${className}`}
            style={{
                fontVariationSettings: filled
                    ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
            }}
        >
            {name}
        </span>
    );
}
