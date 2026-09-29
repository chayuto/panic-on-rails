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
