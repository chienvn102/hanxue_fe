import Link from 'next/link';
import { Icon } from './ui/Icon';

export default function Footer() {
    return (
        <footer className="border-t border-[var(--border)] mt-10 py-10 bg-[var(--background)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <Icon name="translate" className="text-[var(--text-muted)]" />
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">
                        © 2026 HanXue. All rights reserved.
                    </span>
                </div>
                <div className="flex gap-6">
                    <Link href="/about" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                        <Icon name="info" />
                    </Link>
                    <Link href="/contact" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                        <Icon name="mail" />
                    </Link>
                    <Link href="/help" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                        <Icon name="help" />
                    </Link>
                </div>
            </div>
        </footer>
    );
}
