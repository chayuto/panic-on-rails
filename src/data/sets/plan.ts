/**
 * Layout plan builder.
 *
 * Turns a plan (a chain of catalog parts, each attached to a connector of an
 * earlier piece) into placed pieces with world positions — the same thing a
 * modeler does following the diagram in the box. Pure: no stores, no DOM.
 *
 * Every connector left over is either part of a joint (two connectors that
 * meet face to face) or an open end. A correct plan for a closed oval has no
 * open ends, which is how the tests prove the real set's geometry closes.
 */

import { getPartById } from '../catalog/registry';
import { getPartConnectors } from '../catalog/helpers';
import type { PartDefinition } from '../catalog/types';
import type { Vector2 } from '../../types';
import { localToWorld, normalizeAngle, angleDifference } from '../../utils/geometry';
import type { TrackTemplate, TemplateMetadata } from '../templates/types';
import type { LayoutPlan, PlanAnchor, PlanStep } from './types';

/** Connectors closer than this (mm) with opposite facades form a joint (see `LayoutPlan.tolerance`). */
export const JOINT_TOLERANCE_MM = 0.5;
/** Allowed facade error (degrees) for a joint. */
export const JOINT_ANGLE_TOLERANCE = 0.5;

export interface PlacedConnector {
    piece: number;
    connector: string;
    position: Vector2;
    facade: number;
}

export interface PlacedPiece {
    index: number;
    part: PartDefinition;
    /** Part origin, as passed to `addTrack` */
    position: Vector2;
    rotation: number;
    /** Connector the piece was attached by */
    via: string;
    connectors: PlacedConnector[];
}

export interface PlanJoint {
    a: PlacedConnector;
    b: PlacedConnector;
    /** Distance between the two connectors (mm) */
    gap: number;
}

export interface ResolvedPlan {
    pieces: PlacedPiece[];
    joints: PlanJoint[];
    openEnds: PlacedConnector[];
    /** Catalog part id → pieces used */
    billOfMaterials: Record<string, number>;
    /** Bounding box of all connectors (mm) */
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export class PlanError extends Error {
    constructor(plan: LayoutPlan, step: number, message: string) {
        super(`Plan "${plan.id}" step ${step}: ${message}`);
        this.name = 'PlanError';
    }
}

/** Connector pairs that are two ends of the same straight-through route. */
const THROUGH_PAIRS: Record<string, string> = { A1: 'A2', A2: 'A1', B1: 'B2', B2: 'B1' };

/**
 * The connector a train leaves by after entering `part` through `via`,
 * taking the through (main) route. Undefined for single-ended parts.
 */
export function throughExit(part: PartDefinition, via: string): string | undefined {
    const geometry = part.geometry;
    if (geometry.type === 'switch') {
        if (via !== 'entry') return 'entry';
        return geometry.isWye ? 'right' : 'main';
    }
    if (geometry.type === 'crossing' || geometry.type === 'compound') {
        return THROUGH_PAIRS[via];
    }
    if (geometry.type === 'topology') {
        // The first route listed through `via` is its through route
        const route = geometry.routes.find(r => r.from === via || r.to === via);
        return route ? (route.from === via ? route.to : route.from) : undefined;
    }
    return getPartConnectors(part).nodes.map(n => n.localId).find(id => id !== via);
}

/**
 * Place `part` so its connector `via` mates with a target connector:
 * same position, facing the opposite way.
 */
function placeAgainst(part: PartDefinition, via: string, target: { position: Vector2; facade: number }) {
    const connector = getPartConnectors(part).nodes.find(n => n.localId === via);
    if (!connector) return null;
    const rotation = normalizeAngle(target.facade + 180 - connector.localFacade);
    const offset = localToWorld(connector.localPosition, { x: 0, y: 0 }, rotation);
    return {
        position: { x: target.position.x - offset.x, y: target.position.y - offset.y },
        rotation,
    };
}

function worldConnectors(index: number, part: PartDefinition, position: Vector2, rotation: number): PlacedConnector[] {
    return getPartConnectors(part).nodes.map(n => ({
        piece: index,
        connector: n.localId,
        position: localToWorld(n.localPosition, position, rotation),
        facade: normalizeAngle(n.localFacade + rotation),
    }));
}

/** Place every piece of a plan and work out which connectors meet. */
export function resolvePlan(plan: LayoutPlan): ResolvedPlan {
    const pieces: PlacedPiece[] = [];

    plan.steps.forEach((step, index) => {
        const part = getPartById(step.part);
        if (!part) throw new PlanError(plan, index, `unknown part "${step.part}"`);
        const via = step.via ?? getPartConnectors(part).primaryNodeId;

        let position: Vector2 = { x: 0, y: 0 };
        let rotation = 0;
        if (index > 0 && isAlongside(step.at)) {
            const base = pieces[step.at.alongside];
            if (!base || step.at.alongside >= index) {
                throw new PlanError(plan, index, `alongside piece ${step.at.alongside} is not an earlier step`);
            }
            // Same placement as the base piece, shifted sideways (right of travel = +90°)
            position = localToWorld({ x: 0, y: step.at.offset }, base.position, base.rotation);
            rotation = base.rotation;
        } else if (index > 0) {
            const anchor = resolveAnchor(plan, pieces, index, step.at as number | PlanAnchor | undefined);
            const target = pieces[anchor.piece].connectors.find(c => c.connector === anchor.connector);
            if (!target) {
                throw new PlanError(plan, index, `piece ${anchor.piece} has no connector "${anchor.connector}"`);
            }
            const placement = placeAgainst(part, via, target);
            if (!placement) throw new PlanError(plan, index, `${part.id} has no connector "${via}"`);
            ({ position, rotation } = placement);
        }

        pieces.push({ index, part, position, rotation, via, connectors: worldConnectors(index, part, position, rotation) });
    });

    const { joints, openEnds } = matchConnectors(
        pieces.flatMap(p => p.connectors),
        plan.tolerance ?? JOINT_TOLERANCE_MM
    );

    const billOfMaterials: Record<string, number> = {};
    for (const piece of pieces) {
        billOfMaterials[piece.part.id] = (billOfMaterials[piece.part.id] ?? 0) + 1;
    }

    const all = pieces.flatMap(p => p.connectors.map(c => c.position));
    const bounds = all.length === 0
        ? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
        : {
            minX: Math.min(...all.map(p => p.x)),
            minY: Math.min(...all.map(p => p.y)),
            maxX: Math.max(...all.map(p => p.x)),
            maxY: Math.max(...all.map(p => p.y)),
        };

    return { pieces, joints, openEnds, billOfMaterials, bounds };
}

function isAlongside(at: PlanStep['at']): at is { alongside: number; offset: number } {
    return typeof at === 'object' && 'alongside' in at;
}

function resolveAnchor(
    plan: LayoutPlan,
    pieces: PlacedPiece[],
    index: number,
    at: number | PlanAnchor | undefined
): PlanAnchor {
    if (typeof at === 'object') {
        if (at.piece < 0 || at.piece >= index) {
            throw new PlanError(plan, index, `anchor piece ${at.piece} is not an earlier step`);
        }
        return at;
    }
    const pieceIndex = at ?? index - 1;
    if (pieceIndex < 0 || pieceIndex >= index) {
        throw new PlanError(plan, index, `anchor piece ${pieceIndex} is not an earlier step`);
    }
    const anchorPiece = pieces[pieceIndex];
    const connector = throughExit(anchorPiece.part, anchorPiece.via);
    if (!connector) throw new PlanError(plan, index, `piece ${pieceIndex} (${anchorPiece.part.id}) has no through exit`);
    return { piece: pieceIndex, connector };
}

/** Pair up connectors that meet face to face; the rest are open ends. */
function matchConnectors(
    connectors: PlacedConnector[],
    tolerance: number
): { joints: PlanJoint[]; openEnds: PlacedConnector[] } {
    const used = new Set<number>();
    const joints: PlanJoint[] = [];
    for (let i = 0; i < connectors.length; i++) {
        if (used.has(i)) continue;
        for (let j = i + 1; j < connectors.length; j++) {
            if (used.has(j)) continue;
            const a = connectors[i];
            const b = connectors[j];
            if (a.piece === b.piece) continue;
            const gap = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
            if (gap > tolerance) continue;
            if (Math.abs(angleDifference(a.facade, b.facade) - 180) > JOINT_ANGLE_TOLERANCE) continue;
            joints.push({ a, b, gap });
            used.add(i);
            used.add(j);
            break;
        }
    }
    return { joints, openEnds: connectors.filter((_, i) => !used.has(i)) };
}

/** Margin (mm) between the plan's connectors and the table origin. */
const TABLE_MARGIN = 150;

/**
 * Convert a plan into a template recipe the regular template loader (and
 * the headless harness) can build through `addTrack()`.
 */
export function planToTemplate(plan: LayoutPlan, meta: Partial<TemplateMetadata> = {}): TrackTemplate {
    const resolved = resolvePlan(plan);
    const dx = TABLE_MARGIN - resolved.bounds.minX;
    const dy = TABLE_MARGIN - resolved.bounds.minY;
    return {
        version: 2,
        template: {
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            difficulty: 'beginner',
            system: resolved.pieces[0]?.part.scale === 'wooden' ? 'wooden' : 'n-scale',
            estimatedCost: resolved.pieces.reduce((sum, p) => sum + p.part.cost, 0),
            partCount: resolved.pieces.length,
            trainCount: plan.trains?.length ?? 0,
            ...meta,
        },
        parts: resolved.pieces.map(p => ({
            partId: p.part.id,
            position: { x: p.position.x + dx, y: p.position.y + dy },
            rotation: p.rotation,
        })),
        trains: (plan.trains ?? []).map(t => ({ partIndex: t.piece, color: t.color ?? '#E74C3C' })),
        // Plan positions are exact; only connectors that truly meet should merge
        connectThreshold: Math.max(1, (plan.tolerance ?? JOINT_TOLERANCE_MM) + 0.5),
    };
}
