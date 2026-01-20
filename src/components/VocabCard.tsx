import Link from 'next/link';
import { Card } from './ui/Card';
import { HSKBadge } from './ui/Badge';
import { Icon } from './ui/Icon';

interface VocabCardProps {
    id: number;
    simplified: string;
    pinyin: string;
    hanViet?: string;
    meaningVi: string;
    hskLevel: number;
    bookmarked?: boolean;
    onBookmark?: (id: number) => void;
    onAudio?: (id: number) => void;
}

export function VocabCard({
    id,
    simplified,
    pinyin,
    hanViet,
    meaningVi,
    hskLevel,
    bookmarked = false,
    onBookmark,
    onAudio,
}: VocabCardProps) {
    const handleBookmarkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onBookmark?.(id);
    };

    const handleAudioClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onAudio?.(id);
    };

    return (
        <Link href={`/vocab/${id}`}>
            <Card className="group relative flex flex-col hover:-translate-y-1">
                {/* Header: HSK Badge + Bookmark */}
                <div className="flex justify-between items-start mb-2">
                    <HSKBadge level={hskLevel as 1 | 2 | 3 | 4 | 5 | 6} />
                    <button
                        onClick={handleBookmarkClick}
                        className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                    >
                        <Icon
                            name={bookmarked ? 'bookmark' : 'bookmark_border'}
                            filled={bookmarked}
                            className={bookmarked ? 'text-[var(--primary)]' : ''}
                        />
                    </button>
                </div>

                {/* Character Display */}
                <div className="text-center py-2 flex-1">
                    <h3 className="hanzi text-5xl font-normal text-[var(--text-main)] mb-2 group-hover:text-[var(--primary)] transition-colors">
                        {simplified}
                    </h3>
                    <p className="text-lg font-medium text-[var(--text-secondary)]">
                        {pinyin}
                    </p>
                </div>

                {/* Meaning */}
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <p className="text-sm font-medium text-[var(--text-main)] mb-0.5">
                        {meaningVi}
                    </p>
                    {hanViet && (
                        <p className="text-xs italic text-[var(--text-muted)]">
                            Hán Việt: {hanViet}
                        </p>
                    )}
                </div>

                {/* Audio Button */}
                <button
                    onClick={handleAudioClick}
                    className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer border border-[var(--border)]"
                >
                    <Icon name="volume_up" size="sm" />
                </button>
            </Card>
        </Link>
    );
}
