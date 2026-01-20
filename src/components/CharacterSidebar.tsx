'use client';

import { Character, playAudio } from '@/lib/api';
import StrokeWriter from './StrokeWriter';

interface CharacterSidebarProps {
    characters: Character[];
    mainWord: string;
}

export default function CharacterSidebar({ characters, mainWord }: CharacterSidebarProps) {
    if (characters.length === 0) {
        // No character data available
        if (!mainWord) return null;

        return (
            <div className="sidebar-card">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                    Phân tích chữ
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Không có dữ liệu phân tích cho "{mainWord}"
                </p>
            </div>
        );
    }

    return (
        <div className="sidebar-card">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                Phân tích chữ
            </h3>

            <div className="space-y-6">
                {characters.map((char, index) => (
                    <div
                        key={`char-${char.id || index}`}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="flex gap-4 items-start">
                            {/* Stroke Writer - uses hanzi-writer CDN */}
                            <StrokeWriter
                                character={char.hanzi}
                                size={150}
                                strokeColor="#1a365d"
                            />

                            {/* Character Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="hanzi text-3xl font-bold"
                                        style={{ color: 'var(--accent)' }}
                                    >
                                        {char.hanzi}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => playAudio(char.hanzi)}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                                        title="Nghe phát âm"
                                    >
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="text-blue-500"
                                        >
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Pinyin & Han Viet */}
                                <div className="text-sm space-y-0.5">
                                    {char.pinyinMain && (
                                        <div className="pinyin text-base">{char.pinyinMain}</div>
                                    )}
                                    {char.hanViet && (
                                        <div className="han-viet text-base italic" style={{ color: 'var(--accent)' }}>
                                            {char.hanViet}
                                        </div>
                                    )}
                                </div>

                                {/* Meaning - chỉ tiếng Việt */}
                                {char.meaningVi && (
                                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                                        {char.meaningVi}
                                    </p>
                                )}

                                {/* Stroke count & Radical */}
                                <div
                                    className="flex items-center gap-4 mt-2 text-xs"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {char.strokeCount && (
                                        <span>
                                            Số nét: <strong>{char.strokeCount}</strong>
                                        </span>
                                    )}
                                    {char.radical && (
                                        <span>
                                            Bộ: <strong>{char.radical}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Separator */}
                        {index < characters.length - 1 && (
                            <hr className="my-4" style={{ borderColor: 'var(--border)' }} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
