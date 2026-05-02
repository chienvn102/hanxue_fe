'use client';

/**
 * PinyinRuby — render Hán + pinyin theo cột (pinyin trên, Hán dưới).
 *
 * Cách dùng:
 *   <PinyinRuby zh="你好" pinyin="Nǐ hǎo" show={true} />
 *
 * Format pinyin: các âm tiết tách bằng space ("Nǐ hǎo"). Component pair
 * 1-1 giữa ký tự Hán (rộng) và âm tiết pinyin tương ứng. Nếu số âm tiết
 * không khớp số ký tự Hán, fallback render pinyin block ở trên + Hán inline.
 *
 * Khi `show=false`: chỉ render Hán (ẩn dòng pinyin để tiết kiệm chiều cao).
 */

interface Props {
    zh: string;
    pinyin?: string;
    show?: boolean;
    className?: string;
    fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
}

const SIZE_MAP = {
    sm: { hanzi: 'text-sm', pinyin: 'text-[10px]' },
    base: { hanzi: 'text-base', pinyin: 'text-xs' },
    lg: { hanzi: 'text-lg', pinyin: 'text-xs' },
    xl: { hanzi: 'text-xl', pinyin: 'text-sm' },
    '2xl': { hanzi: 'text-2xl', pinyin: 'text-base' },
};

// Hanzi range — bao gồm CJK Unified + Extension A
const HANZI_RE = /[㐀-鿿豈-﫿]/;

export function PinyinRuby({ zh, pinyin, show = true, className = '', fontSize = 'base' }: Props) {
    const size = SIZE_MAP[fontSize];

    if (!show || !pinyin) {
        // Chỉ render Hán
        return <span className={`${size.hanzi} ${className}`}>{zh}</span>;
    }

    // Tách thành mảng "tokens" — mỗi token là 1 ký tự Hán hoặc 1 cụm non-Hán
    // Cụm non-Hán không có pinyin (ví dụ dấu câu, số, latin chars).
    const zhTokens: { char: string; isHanzi: boolean }[] = [];
    for (const ch of zh) {
        zhTokens.push({ char: ch, isHanzi: HANZI_RE.test(ch) });
    }

    // Tách pinyin syllables theo whitespace
    const pinyinSyllables = pinyin.trim().split(/\s+/);
    const hanziCount = zhTokens.filter(t => t.isHanzi).length;

    // Nếu số âm tiết KHÔNG khớp số chữ Hán → fallback: render pinyin block trên 1 dòng riêng
    if (pinyinSyllables.length !== hanziCount) {
        return (
            <span className={`inline-flex flex-col items-start ${className}`}>
                <span className={`${size.pinyin} text-[var(--text-muted)] italic leading-tight`}>
                    {pinyin}
                </span>
                <span className={`${size.hanzi}`}>{zh}</span>
            </span>
        );
    }

    // Pair từng ký tự Hán với âm tiết pinyin tương ứng
    let pyIdx = 0;
    return (
        <span className={`inline-flex flex-wrap items-end ${className}`}>
            {zhTokens.map((t, idx) => {
                const syllable = t.isHanzi ? pinyinSyllables[pyIdx++] : '';
                return (
                    <span key={idx} className="inline-flex flex-col items-center mx-[1px]">
                        <span className={`${size.pinyin} text-[var(--text-muted)] italic leading-none mb-[2px] min-h-[12px]`}>
                            {syllable || ' '}
                        </span>
                        <span className={`${size.hanzi} leading-tight`}>{t.char}</span>
                    </span>
                );
            })}
        </span>
    );
}
