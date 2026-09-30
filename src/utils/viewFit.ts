/**
 * Fit-to-view: the zoom and pan that frame a set of points in the viewport.
 */

import type { Vector2 } from '../types';
import { useTrackStore } from '../stores/useTrackStore';
import { useEditorStore } from '../stores/useEditorStore';

export interface ViewTransform {
    zoom: number;
    pan: Vector2;
}

/**
 * Zoom/pan so every point fits inside a `width`×`height` viewport with
 * `padding` screen pixels on each side, centred. Never zooms in past
 * `maxZoom` (small layouts stay life-size rather than ballooning).
 * Screen = world × zoom + pan.
 */
export function fitViewToPoints(
    points: Vector2[],
    width: number,
    height: number,
    padding = 60,
    maxZoom = 1
): ViewTransform | null {
    if (points.length === 0 || width <= 0 || height <= 0) return null;

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const availW = Math.max(1, width - padding * 2);
    const availH = Math.max(1, height - padding * 2);
    const zoom = Math.min(
        maxZoom,
        availW / Math.max(1, maxX - minX),
        availH / Math.max(1, maxY - minY),
    );

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { zoom, pan: { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom } };
}

/**
 * Frame the whole current layout in the canvas (browser only).
 * Reads node positions from the track store and the canvas container's size.
 */
export function fitViewToLayout(): void {
    const container = document.querySelector('[data-testid="canvas-container"]');
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const points = Object.values(useTrackStore.getState().nodes).map(n => n.position);
    const view = fitViewToPoints(points, width, height);
    if (!view) return;
    const editor = useEditorStore.getState();
    editor.setZoom(view.zoom);
    editor.setPan(view.pan.x, view.pan.y);
}

/**
 * Frame the layout once the screen has settled: starting the trains swaps
 * the parts bin for the wider train panel, which shrinks the canvas.
 */
export function fitViewWhenSettled(): void {
    fitViewToLayout();
    // Two frames: React renders the new sidebar, then the browser lays it out
    requestAnimationFrame(() => requestAnimationFrame(fitViewToLayout));
}

/**
 * The pan that brings every point inside the viewport, at least `margin`
 * screen pixels from each edge, moving as little as possible and keeping the
 * zoom. If the points are too far apart to all fit, it centres them. Null
 * when they are all in view already.
 */
export function panToInclude(
    points: Vector2[],
    view: ViewTransform,
    width: number,
    height: number,
    margin = 60
): Vector2 | null {
    if (points.length === 0) return null;
    const screen = points.map(p => ({ x: p.x * view.zoom + view.pan.x, y: p.y * view.zoom + view.pan.y }));
    const minX = Math.min(...screen.map(p => p.x)), maxX = Math.max(...screen.map(p => p.x));
    const minY = Math.min(...screen.map(p => p.y)), maxY = Math.max(...screen.map(p => p.y));

    const shift = (lo: number, hi: number, size: number) => {
        if (hi - lo > size - 2 * margin) return size / 2 - (lo + hi) / 2;
        if (lo < margin) return margin - lo;
        if (hi > size - margin) return size - margin - hi;
        return 0;
    };
    const dx = shift(minX, maxX, width);
    const dy = shift(minY, maxY, height);
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
    return { x: view.pan.x + dx, y: view.pan.y + dy };
}

/**
 * Keep the ends a player is building from in view: pan (never zoom) when a
 * piece's open end lands off screen or near the edge (browser only).
 */
export function keepInView(points: Vector2[]): void {
    const container = document.querySelector('[data-testid="canvas-container"]');
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const editor = useEditorStore.getState();
    const pan = panToInclude(points, { zoom: editor.zoom, pan: editor.pan }, width, height);
    if (pan) editor.setPan(pan.x, pan.y);
}
