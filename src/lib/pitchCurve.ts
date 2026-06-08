/**
 * Draw pitch (f0) contours onto a canvas — used by the Tone Trainer panel to
 * overlay the user's pitch curve on top of the native / target tone template.
 *
 * Conventions:
 *   - Y-axis: high pitch on top, low pitch at bottom.
 *   - Contour values are already normalized to [0..1] (BE does this with
 *     log-pitch normalization). Length is whatever — we resample to canvas
 *     width on draw.
 */

export interface CurveLayer {
    label: string;
    color: string;
    points: number[];      // normalized [0..1] or undefined to skip
    dashed?: boolean;
    thickness?: number;
}

export interface DrawOptions {
    bg?: string;
    grid?: boolean;
    legend?: boolean;
}

/**
 * Render multiple contours stacked on the same axes. The canvas is expected
 * to already have a sized `width` / `height` (consider devicePixelRatio for
 * crispness — caller can multiply if desired).
 */
export function drawPitchCurves(
    canvas: HTMLCanvasElement,
    layers: CurveLayer[],
    opts: DrawOptions = {}
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const padding = { top: 16, right: 16, bottom: 24, left: 32 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Background
    ctx.fillStyle = opts.bg || '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Optional grid (5 horizontal lines)
    if (opts.grid !== false) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (plotH * i) / 4;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + plotW, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    // Y-axis labels (Low / Mid / High)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Cao', padding.left - 6, padding.top + 4);
    ctx.fillText('TB', padding.left - 6, padding.top + plotH / 2 + 4);
    ctx.fillText('Thấp', padding.left - 6, padding.top + plotH + 4);

    // Draw each layer
    for (const layer of layers) {
        if (!layer.points || layer.points.length < 2) continue;
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.thickness || 2.5;
        if (layer.dashed) ctx.setLineDash([6, 4]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        const n = layer.points.length;
        for (let i = 0; i < n; i++) {
            const x = padding.left + (plotW * i) / (n - 1);
            const v = clamp01(layer.points[i]);
            const y = padding.top + plotH * (1 - v);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Legend
    if (opts.legend !== false && layers.length) {
        let lx = padding.left + 4;
        const ly = padding.top + 4;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        for (const layer of layers) {
            if (!layer.points || layer.points.length < 2) continue;
            ctx.fillStyle = layer.color;
            ctx.fillRect(lx, ly, 12, 3);
            ctx.fillStyle = '#334155';
            ctx.fillText(layer.label, lx + 16, ly + 6);
            lx += ctx.measureText(layer.label).width + 36;
        }
    }
}

function clamp01(v: number): number {
    if (!Number.isFinite(v)) return 0.5;
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}

/** Static template per tone — mirrors BE pitch.toneTemplate (50 points). */
export function toneTemplatePoints(tone: number): number[] {
    const t: number[] = new Array(50);
    switch (tone) {
        case 1:
            for (let i = 0; i < 50; i++) t[i] = 0.85;
            break;
        case 2:
            for (let i = 0; i < 50; i++) t[i] = 0.2 + 0.75 * (i / 49);
            break;
        case 3:
            for (let i = 0; i < 50; i++) {
                const x = i / 49;
                t[i] = x < 0.4
                    ? 0.4 - (0.35 * (x / 0.4))
                    : 0.05 + (0.65 * ((x - 0.4) / 0.6));
            }
            break;
        case 4:
            for (let i = 0; i < 50; i++) t[i] = 0.95 - 0.9 * (i / 49);
            break;
        case 5:
        default:
            for (let i = 0; i < 50; i++) t[i] = 0.5;
            break;
    }
    return t;
}
