/**
 * Car sprites: each kind of car is drawn once per colour and length into an
 * offscreen canvas (with its soft shadow baked in), then stamped along the
 * track every frame. Drawing a bitmap is far cheaper than redrawing vector
 * shapes or blurring a shadow per car per frame.
 *
 * Sprites are drawn looking down, at N size, with the front of the car
 * toward +x.
 */

import { ROLLING_STOCK } from '../../../config/rollingStock';
import type { CarKind } from '../../../data/rollingStock';

/** Pixels per mm the sprites are drawn at (crisp up to about 4× zoom). */
const RES = 6;
/** Room around the body for the baked shadow (mm). */
export const SPRITE_MARGIN = 4;

const cache = new Map<string, HTMLCanvasElement>();

function shade(hex: string, percent: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    if (Number.isNaN(n)) return hex;
    const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * (percent > 0 ? 255 - c : c))));
    const r = f((n >> 16) & 255);
    const g = f((n >> 8) & 255);
    const b = f(n & 255);
    return `rgb(${r}, ${g}, ${b})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawLoco(ctx: CanvasRenderingContext2D, color: string, L: number, W: number) {
    const x0 = -L / 2;
    const y0 = -W / 2;
    // Body with a shadow underneath
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 2.5 * RES;
    ctx.shadowOffsetX = 0.8 * RES;
    ctx.shadowOffsetY = 1.2 * RES;
    roundRect(ctx, x0, y0, L, W, 3);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, x0, y0, L, W, 3);
    ctx.stroke();

    // Long hood roof, darker, with two radiator fans at the rear
    ctx.fillStyle = shade(color, -22);
    roundRect(ctx, x0 + 2, y0 + 2.5, L - 14, W - 5, 1.5);
    ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    for (const fx of [x0 + 6, x0 + 13]) {
        ctx.beginPath();
        ctx.arc(fx, 0, 2.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.3;
    for (const fx of [x0 + 6, x0 + 13]) {
        ctx.beginPath();
        ctx.moveTo(fx - 2.6, 0);
        ctx.lineTo(fx + 2.6, 0);
        ctx.moveTo(fx, -2.6);
        ctx.lineTo(fx, 2.6);
        ctx.stroke();
    }

    // Cab roof and windshield at the front
    ctx.fillStyle = shade(color, 12);
    roundRect(ctx, L / 2 - 11, y0 + 1.5, 8, W - 3, 1.2);
    ctx.fill();
    ctx.fillStyle = '#1d2630';
    roundRect(ctx, L / 2 - 3.2, y0 + 2, 2.2, W - 4, 0.8);
    ctx.fill();

    // Headlight
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(L / 2 - 0.6, 0, 1.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawCoach(ctx: CanvasRenderingContext2D, color: string, L: number, W: number) {
    const x0 = -L / 2;
    const y0 = -W / 2;
    const body = shade(color, 18);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2.5 * RES;
    ctx.shadowOffsetX = 0.8 * RES;
    ctx.shadowOffsetY = 1.2 * RES;
    roundRect(ctx, x0, y0, L, W, 2);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(ctx, x0, y0, L, W, 2);
    ctx.stroke();

    // Roof with a ridge and vents
    ctx.fillStyle = shade(color, -10);
    roundRect(ctx, x0 + 2, y0 + 2, L - 4, W - 4, 1.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x0 + 3, 0);
    ctx.lineTo(-x0 - 3, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(x0 + 7 + i * ((L - 14) / 3) - 1.2, -1.2, 2.4, 2.4);
    }
    // Gangway diaphragms at both ends
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(x0 - 0.8, -3, 1.6, 6);
    ctx.fillRect(-x0 - 0.8, -3, 1.6, 6);
}

/** A freight car, looking into it: an open top with ribs across, whatever it carries. */
function drawWagon(ctx: CanvasRenderingContext2D, color: string, L: number, W: number) {
    const x0 = -L / 2;
    const y0 = -W / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2.5 * RES;
    ctx.shadowOffsetX = 0.8 * RES;
    ctx.shadowOffsetY = 1.2 * RES;
    roundRect(ctx, x0, y0, L, W, 1.2);
    ctx.fillStyle = shade(color, -12);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(ctx, x0, y0, L, W, 1.2);
    ctx.stroke();

    ctx.fillStyle = shade(color, -48);
    roundRect(ctx, x0 + 1.6, y0 + 1.6, L - 3.2, W - 3.2, 0.8);
    ctx.fill();
    ctx.strokeStyle = shade(color, -20);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const ribs = Math.max(1, Math.round((L - 3.2) / 9));
    for (let i = 1; i < ribs; i++) {
        const x = x0 + 1.6 + (i * (L - 3.2)) / ribs;
        ctx.moveTo(x, y0 + 1.6);
        ctx.lineTo(x, -y0 - 1.6);
    }
    ctx.stroke();
}

/**
 * Sprite for one kind of car, `length` mm long at N size, in one colour.
 * Crashed trains use a scorched grey. Returns null outside a browser.
 */
export function getCarSprite(kind: CarKind, color: string, crashed: boolean, length: number): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    // A tenth of a millimetre is as fine as a length needs to be
    const L = Math.round(length * 10) / 10;
    const key = `${kind}|${crashed ? 'crashed' : color}|${L}`;
    const hit = cache.get(key);
    if (hit) return hit;

    const W = ROLLING_STOCK.CAR_WIDTH;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((L + 2 * SPRITE_MARGIN) * RES);
    canvas.height = Math.ceil((W + 2 * SPRITE_MARGIN) * RES);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(RES, RES);
    ctx.translate(L / 2 + SPRITE_MARGIN, W / 2 + SPRITE_MARGIN);
    const paint = crashed ? '#555555' : color;
    if (kind === 'loco') drawLoco(ctx, paint, L, W);
    else if (kind === 'wagon') drawWagon(ctx, paint, L, W);
    else drawCoach(ctx, paint, L, W);

    cache.set(key, canvas);
    return canvas;
}
