/**
 * Pinyin chart types + small helpers. The actual table data is fetched from
 * BE via `fetchPinyinChart()` to keep a single source of truth.
 *
 * Syllable key format: "<base><tone>"
 *   e.g. "ma3", "shi4", "zhi1", "ba5" (5 = neutral tone).
 */

export interface PinyinChart {
    initials: string[];        // ["∅","b","p",…]
    finals: string[];          // ["a","o",…]
    valid: Record<string, string[]>;   // initial → finals it pairs with
}

const TONE_MARKS: Record<string, string[]> = {
    a: ['ā', 'á', 'ǎ', 'à', 'a'],
    e: ['ē', 'é', 'ě', 'è', 'e'],
    i: ['ī', 'í', 'ǐ', 'ì', 'i'],
    o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
    u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
    ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

/** "ma3" → "mǎ"; falls back to the input on parse errors. */
export function applyToneMark(syllableWithTone: string): string {
    const m = String(syllableWithTone || '').match(/^([a-zü]+?)([1-5])?$/i);
    if (!m) return syllableWithTone;
    const base = m[1].toLowerCase().replace(/v/g, 'ü');
    const tone = Number(m[2] || 5);
    if (tone < 1 || tone > 5) return base;

    let vowelIdx = -1;
    for (const p of ['a', 'o', 'e']) {
        const idx = base.indexOf(p);
        if (idx !== -1) { vowelIdx = idx; break; }
    }
    if (vowelIdx === -1) {
        for (let i = base.length - 1; i >= 0; i--) {
            if ('iuü'.includes(base[i])) { vowelIdx = i; break; }
        }
    }
    if (vowelIdx === -1) return base;
    const marks = TONE_MARKS[base[vowelIdx]];
    if (!marks) return base;
    return base.slice(0, vowelIdx) + marks[tone - 1] + base.slice(vowelIdx + 1);
}

/**
 * Build syllable string from (initial, final) — matches BE logic in
 * config/pinyinChart.js.
 */
export function buildSyllable(initial: string, final: string, tone: number): string {
    let base: string;
    if (initial === '∅') {
        base = final;
    } else if (initial === 'y') {
        if (final === 'i') base = 'yi';
        else if (final === 'in') base = 'yin';
        else if (final === 'ing') base = 'ying';
        else if (final === 'ü') base = 'yu';
        else if (final === 'üe') base = 'yue';
        else if (final === 'üan') base = 'yuan';
        else if (final === 'ün') base = 'yun';
        else if (final.startsWith('i')) base = 'y' + final.slice(1);
        else base = 'y' + final;
    } else if (initial === 'w') {
        if (final === 'u') base = 'wu';
        else if (final.startsWith('u')) base = 'w' + final.slice(1);
        else base = 'w' + final;
    } else if (['j', 'q', 'x'].includes(initial)) {
        const f = final.replace(/ü/g, 'u');
        base = initial + f;
    } else {
        base = initial + final;
    }
    return base + String(tone || 1);
}

export const TONE_LABEL: Record<number, string> = {
    1: 'mā (1)',
    2: 'má (2)',
    3: 'mǎ (3)',
    4: 'mà (4)',
    5: 'ma (5)',
};

export const TONE_SHAPE_VI: Record<number, string> = {
    1: 'Cao đều',
    2: 'Đi lên',
    3: 'Xuống rồi lên',
    4: 'Rơi xuống',
    5: 'Nhẹ trung tính',
};

export const TONE_COLOR: Record<number, string> = {
    1: '#0ea5e9',  // sky
    2: '#10b981',  // emerald
    3: '#f59e0b',  // amber
    4: '#ef4444',  // red
    5: '#94a3b8',  // slate
};
