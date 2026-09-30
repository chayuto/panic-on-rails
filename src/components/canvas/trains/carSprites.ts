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
import type { CarKind, Traction } from '../../../data/rollingStock';

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

/** A body outline filled in `fill`, with a soft shadow under it and a dark edge. */
function shell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 2.5 * RES;
    ctx.shadowOffsetX = 0.8 * RES;
    ctx.shadowOffsetY = 1.2 * RES;
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

/** A diesel: a long hood with radiator fans at the rear, and the cab at the front. */
function drawDiesel(ctx: CanvasRenderingContext2D, color: string, L: number, W: number) {
    const x0 = -L / 2;
    const y0 = -W / 2;
    shell(ctx, x0, y0, L, W, 3, color);

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
    dot(ctx, L / 2 - 0.6, 0, 1.3, '#fff6c8');
}

/**
 * A steam locomotive from above: the boiler down the middle, smokebox and
 * chimney at the front, the cab, and behind it a tank engine's coal bunker
 * or a tender engine's tender.
 */
function drawSteam(ctx: CanvasRenderingContext2D, color: string, L: number, W: number, tender: boolean) {
    const y0 = -W / 2;
    // A tender engine is the front 58%, its tender the rest
    const engine = tender ? L * 0.58 : L;
    const rear = L / 2 - engine;
    const front = L / 2;
    // Running plate, with the wheels' splashers under it
    shell(ctx, rear, y0 + 0.6, engine, W - 1.2, 1.2, shade(color, -60));
    const cab = engine * (tender ? 0.2 : 0.22);
    const bunker = tender ? 0 : engine * 0.12;
    const boilerRear = rear + bunker + cab;
    const bw = W * 0.54;
    // A tank engine's side tanks, either side of the boiler
    if (!tender) {
        ctx.fillStyle = shade(color, -10);
        roundRect(ctx, boilerRear, y0 + 1, engine * 0.36, W - 2, 1);
        ctx.fill();
    }
    // Boiler, with a highlight along its top, and a dark smokebox at the front
    ctx.fillStyle = color;
    roundRect(ctx, boilerRear, -bw / 2, front - 0.8 - boilerRear, bw, bw / 2);
    ctx.fill();
    ctx.fillStyle = shade(color, 35);
    roundRect(ctx, boilerRear + 1, -bw * 0.12, front - 2.5 - boilerRear, bw * 0.24, bw * 0.12);
    ctx.fill();
    ctx.fillStyle = '#222';
    roundRect(ctx, front - 0.8 - engine * 0.13, -bw / 2, engine * 0.13, bw, bw / 2);
    ctx.fill();
    // Chimney, dome and safety valves
    dot(ctx, front - engine * 0.08, 0, W * 0.11, '#111');
    dot(ctx, front - engine * 0.36, 0, W * 0.12, '#b8912f');
    dot(ctx, boilerRear + engine * 0.05, 0, W * 0.07, '#b8912f');
    // Cab roof, full width
    ctx.fillStyle = shade(color, 12);
    roundRect(ctx, boilerRear - cab, y0 + 0.2, cab, W - 0.4, 1.2);
    ctx.fill();
    // Coal: in the bunker behind the cab, or the front of the tender
    if (!tender) {
        ctx.fillStyle = '#2a2a2a';
        roundRect(ctx, rear + 0.8, y0 + 2, bunker - 1, W - 4, 0.6);
        ctx.fill();
    } else {
        const tx = -L / 2;
        const tl = L - engine - 1.2;
        shell(ctx, tx, y0 + 0.4, tl, W - 0.8, 1.2, color);
        ctx.fillStyle = '#2a2a2a';
        roundRect(ctx, tx + tl * 0.4, y0 + 2, tl * 0.56, W - 4, 0.8);
        ctx.fill();
        dot(ctx, tx + tl * 0.18, 0, W * 0.1, shade(color, -40));
    }
    // Lamp on the buffer beam
    dot(ctx, front - 0.5, 0, 1, '#fff6c8');
}

/** An electric: a box body with a pantograph at each end, and a cab at both. */
function drawElectric(ctx: CanvasRenderingContext2D, color: string, L: number, W: number) {
    const x0 = -L / 2;
    const y0 = -W / 2;
    shell(ctx, x0, y0, L, W, 2.5, color);
    // Roof with its equipment
    ctx.fillStyle = shade(color, -18);
    roundRect(ctx, x0 + 5, y0 + 2, L - 10, W - 4, 1.2);
    ctx.fill();
    ctx.strokeStyle = '#1e1e1e';
    for (const px of [x0 + L * 0.27, x0 + L * 0.73]) {
        // The pantograph's frame folded down, and its head across the roof
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(px - 4, 0);
        ctx.lineTo(px, -W * 0.3);
        ctx.lineTo(px + 4, 0);
        ctx.lineTo(px, W * 0.3);
        ctx.closePath();
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, -W * 0.4);
        ctx.lineTo(px, W * 0.4);
        ctx.stroke();
    }
    // Windscreens at both ends
    ctx.fillStyle = '#1d2630';
    roundRect(ctx, L / 2 - 3.2, y0 + 2, 2.2, W - 4, 0.8);
    ctx.fill();
    roundRect(ctx, x0 + 1, y0 + 2, 2.2, W - 4, 0.8);
    ctx.fill();
    dot(ctx, L / 2 - 0.6, 0, 1.3, '#fff6c8');
}

function drawLoco(ctx: CanvasRenderingContext2D, traction: Traction, color: string, L: number, W: number) {
    if (traction === 'electric') drawElectric(ctx, color, L, W);
    else if (traction === 'steam-tank' || traction === 'steam-tender') drawSteam(ctx, color, L, W, traction === 'steam-tender');
    else drawDiesel(ctx, color, L, W);
}

function drawCoach(ctx: CanvasRenderingContext2D, color: string, L: number, W: number) {
    const x0 = -L / 2;
    const y0 = -W / 2;
    shell(ctx, x0, y0, L, W, 2, shade(color, 18));

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
    shell(ctx, x0, y0, L, W, 1.2, shade(color, -12));

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
 * Sprite for one kind of car, `length` mm long at N size, in one colour; a
 * locomotive as its `traction` looks. Crashed trains use a scorched grey.
 * Returns null outside a browser.
 */
export function getCarSprite(kind: CarKind, color: string, crashed: boolean, length: number, traction: Traction = 'diesel'): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    // A tenth of a millimetre is as fine as a length needs to be
    const L = Math.round(length * 10) / 10;
    const key = `${kind === 'loco' ? traction : kind}|${crashed ? 'crashed' : color}|${L}`;
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
    if (kind === 'loco') drawLoco(ctx, traction, paint, L, W);
    else if (kind === 'wagon') drawWagon(ctx, paint, L, W);
    else drawCoach(ctx, paint, L, W);

    cache.set(key, canvas);
    return canvas;
}
