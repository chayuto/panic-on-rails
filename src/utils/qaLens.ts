/**
 * A player's-eye view of the canvas, for tests and agents.
 *
 * Track and trains are drawn on one <canvas>, invisible to the DOM and the
 * accessibility tree. `look()` says what is on screen and where, in page
 * coordinates, so a test or an agent driving a browser can play with real
 * mouse input: drop a piece at an open end, click a set of points, follow a
 * train. It only reads; it never changes the game. (One side effect outside
 * the game: Playwright's `page.evaluate` runs as a user gesture in Chromium,
 * so calling it unlocks audio and other gesture-gated features.)
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useEditorStore } from '../stores/useEditorStore';
import { useModeStore } from '../stores/useModeStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { useLogicStore } from '../stores/useLogicStore';
import { getPartById } from '../data/catalog';
import { getRollingStock } from '../data/rollingStock';
import { SCALES } from '../config/scales';
import { scaleKmh } from '../simulation/driving';
import { nextDeparture } from '../simulation/stations';
import { isOpenEnd } from './graphAnalysis';
import { getPositionOnEdge } from './trainGeometry';
import { pointsButtonRadius } from '../config/interactions';
import type { Vector2 } from '../types';

/** A point on the page (CSS pixels, like `MouseEvent.clientX/Y`). */
export interface PagePoint {
    x: number;
    y: number;
    /** Inside the visible canvas */
    onScreen: boolean;
    /** On screen and not covered by a button, hint or panel: a click here reaches the canvas */
    clear: boolean;
}

export interface QaLook {
    mode: 'edit' | 'simulate';
    running: boolean;
    /** Hobby money in cents, or null in free build */
    wallet: number | null;
    /** The canvas on the page */
    canvas: { x: number; y: number; width: number; height: number; zoom: number };
    /** Onboarding hints and toasts showing now */
    hints: string[];
    /** Open dialogs, by their accessible name ("Hobby shop", "Replace layout") */
    dialogs: string[];
    /** The piece selected in the editor, by name */
    selected: string | null;
    pieces: { part: string; name: string; code?: string; at: PagePoint }[];
    /**
     * Ends new track can join, with where to drop a piece so it attaches
     * there: straight on, or hovering a little to one side, which makes a
     * curve turn that way.
     */
    openEnds: { at: PagePoint; facing: number; drop: { ahead: PagePoint; left: PagePoint; right: PagePoint } }[];
    /** Sets of points, with the size of their button on screen (px across) */
    points: { part: string; at: PagePoint; set: 'normal' | 'reverse'; size: number }[];
    trains: { id: string; name: string; at: PagePoint; kmh: number; crashed: boolean; stopped: boolean; atStation: string | null }[];
    /**
     * Station platforms, at the middle of the track beside them, with their
     * timetable: a departure every `interval` railway seconds, the next at `next`
     */
    stations: { name: string; at: PagePoint; interval: number | null; next: number | null }[];
    /** Trains wrecked this session (re-railed ones included) */
    wrecks: number;
}

const DROP_AHEAD_PX = 10;
const DROP_SIDE_PX = 7;

export function look(): QaLook {
    const { nodes, edges } = useTrackStore.getState();
    const { zoom, pan } = useEditorStore.getState();
    const container = document.querySelector('[data-testid="canvas-container"]');
    const rect = container?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };

    const page = (x: number, y: number): PagePoint => {
        const px = Math.round(rect.left + x);
        const py = Math.round(rect.top + y);
        const onScreen = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
        // Whatever is on top at that point: the canvas, or something covering it
        const top = onScreen ? document.elementFromPoint(px, py) : null;
        return { x: px, y: py, onScreen, clear: !!top && !!container?.contains(top) };
    };
    const toPage = (p: Vector2): PagePoint => page(p.x * zoom + pan.x, p.y * zoom + pan.y);

    // One entry per placed piece, at the middle of its nodes
    const byPiece = new Map<string, { part: string; points: Vector2[] }>();
    for (const edge of Object.values(edges)) {
        const key = edge.placementId ?? edge.id;
        const entry = byPiece.get(key) ?? { part: edge.partId, points: [] };
        for (const id of [edge.startNodeId, edge.endNodeId]) {
            const node = nodes[id];
            if (node) entry.points.push(node.position);
        }
        byPiece.set(key, entry);
    }
    const pieces = [...byPiece.values()].map(({ part, points }) => {
        const def = getPartById(part);
        const x = points.reduce((sum, p) => sum + p.x, 0) / Math.max(1, points.length);
        const y = points.reduce((sum, p) => sum + p.y, 0) / Math.max(1, points.length);
        return { part, name: def?.name ?? part, ...(def?.productCode && { code: def.productCode }), at: toPage({ x, y }) };
    });

    const openEnds = Object.values(nodes).filter(isOpenEnd).map(node => {
        const r = (node.rotation * Math.PI) / 180;
        const screen = { x: node.position.x * zoom + pan.x, y: node.position.y * zoom + pan.y };
        const ahead = { x: screen.x + Math.cos(r) * DROP_AHEAD_PX, y: screen.y + Math.sin(r) * DROP_AHEAD_PX };
        // Right of the facing direction on screen (+Y down) is (-sin, cos)
        const side = (sign: 1 | -1) => page(ahead.x - Math.sin(r) * DROP_SIDE_PX * sign, ahead.y + Math.cos(r) * DROP_SIDE_PX * sign);
        return {
            at: page(screen.x, screen.y),
            facing: node.rotation,
            drop: { ahead: page(ahead.x, ahead.y), left: side(-1), right: side(1) },
        };
    });

    const points = Object.values(nodes).filter(n => n.type === 'switch').map(node => {
        const part = edges[node.connections[0]]?.partId ?? '';
        return {
            part: getPartById(part)?.name ?? part,
            at: toPage(node.position),
            set: node.switchState === 1 ? 'reverse' as const : 'normal' as const,
            size: Math.round(2 * pointsButtonRadius(zoom) * zoom),
        };
    });

    const trains = Object.values(useSimulationStore.getState().trains).flatMap(train => {
        const edge = edges[train.currentEdgeId];
        if (!edge) return [];
        const stock = getRollingStock(train.stockId);
        return [{
            id: train.id,
            name: stock?.name ?? train.id,
            at: toPage(getPositionOnEdge(edge, train.distanceAlongEdge, nodes)),
            kmh: Math.round(scaleKmh(train.speed, SCALES[train.scale ?? 'n-scale'].ratio)),
            crashed: !!train.crashed,
            stopped: !!train.stopped,
            atStation: train.dwell !== undefined ? useLogicStore.getState().stations[train.calledAt ?? '']?.name ?? null : null,
        }];
    });

    const stations = Object.values(useLogicStore.getState().stations).flatMap(station => {
        const edge = edges[station.edgeId];
        if (!edge) return [];
        const next = nextDeparture(station, useSimulationStore.getState().simElapsed);
        return [{ name: station.name, at: toPage(getPositionOnEdge(edge, station.position, nodes)), interval: station.interval ?? null, next: next ?? null }];
    });

    const collection = useCollectionStore.getState();
    const hints = [...document.querySelectorAll('.onboarding-hint__content, .onboarding-toast__content')]
        .map(el => (el as HTMLElement).innerText.trim())
        .filter(Boolean);

    const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')]
        .map(el => el.getAttribute('aria-label') ?? 'dialog');

    return {
        mode: useModeStore.getState().primaryMode === 'simulate' ? 'simulate' : 'edit',
        running: useSimulationStore.getState().isRunning,
        wallet: collection.mode === 'collection' ? collection.wallet : null,
        canvas: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height), zoom },
        hints: [...new Set(hints)],
        dialogs,
        selected: (() => {
            const id = useEditorStore.getState().selectedEdgeId;
            const part = id ? edges[id]?.partId : undefined;
            return part ? getPartById(part)?.name ?? part : null;
        })(),
        pieces,
        openEnds,
        points,
        trains,
        stations,
        wrecks: useSimulationStore.getState().wrecks,
    };
}
