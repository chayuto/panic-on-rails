/**
 * Model-based tests of building: random sequences of what a player does in
 * the editor, run against the real stores, snap manager and join.
 *
 * - Drop a piece at an open end, hovering straight on or to one side, or
 *   anywhere on the table.
 * - Delete a piece, undo, redo, throw a set of points.
 *
 * After every step the track must still be one consistent graph. When a
 * sequence breaks it, fast-check shrinks it to the shortest one that does,
 * and prints the seed and path to replay it. The join bug fixed in #137
 * (a turnout dropped by its entry lost its points) is the kind this finds.
 */

import { describe, expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { useTrackStore } from '../useTrackStore';
import { useHistoryStore } from '../useHistoryStore';
import { resetWorld } from '../../simulation/harness';
import { getPartById } from '../../data/catalog';
import { findBestSnap } from '../../utils/snapManager';
import { joinPlacedPiece } from '../../utils/joinPiece';

/** Kato pieces of every kind: straight, curve, turnouts, crossing, compound, topology, buffer stop. */
const PARTS = [
    'kato-20-000', 'kato-20-020', 'kato-20-120', 'kato-20-110',
    'kato-20-202', 'kato-20-203', 'kato-20-320', 'kato-20-230', 'kato-20-210', 'kato-20-046',
];

type Step =
    | { kind: 'drop'; part: number; end: number; side: -1 | 0 | 1; turn: number }
    | { kind: 'delete'; piece: number }
    | { kind: 'undo' }
    | { kind: 'redo' }
    | { kind: 'throw'; points: number };

const drop = fc.record({
    kind: fc.constant('drop' as const),
    part: fc.nat(PARTS.length - 1),
    end: fc.nat(),
    side: fc.constantFrom(-1 as const, 0 as const, 1 as const),
    turn: fc.nat(7),
});

const step: fc.Arbitrary<Step> = fc.oneof(
    { weight: 6, arbitrary: drop },
    { weight: 1, arbitrary: fc.record({ kind: fc.constant('delete' as const), piece: fc.nat() }) },
    { weight: 1, arbitrary: fc.constant({ kind: 'undo' as const }) },
    { weight: 1, arbitrary: fc.constant({ kind: 'redo' as const }) },
    { weight: 1, arbitrary: fc.record({ kind: fc.constant('throw' as const), points: fc.nat() }) },
);

/** Drop a piece the way the editor does: snap to where the cursor is, place, join. */
function dropPiece(s: Extract<Step, { kind: 'drop' }>): void {
    const track = useTrackStore.getState();
    const part = getPartById(PARTS[s.part])!;
    const open = track.getOpenEndpoints();
    let position = { x: 2000 + s.turn * 300, y: 2000 };
    let rotation = s.turn * 45;
    if (open.length > 0) {
        // Just ahead of an open end, a little to one side: as a player hovers
        const target = open[s.end % open.length];
        const r = (target.rotation * Math.PI) / 180;
        const cursor = {
            x: target.position.x + Math.cos(r) * 8 - Math.sin(r) * 6 * s.side,
            y: target.position.y + Math.sin(r) * 8 + Math.cos(r) * 6 * s.side,
        };
        const snap = findBestSnap(part, cursor, rotation, open, 'n-scale');
        position = snap ? snap.ghostTransform.position : cursor;
        rotation = snap ? snap.ghostTransform.rotation : rotation;
    }
    useHistoryStore.getState().record();
    const id = track.addTrack(part.id, position, rotation);
    if (id) joinPlacedPiece(id);
}

function apply(s: Step): void {
    const track = useTrackStore.getState();
    switch (s.kind) {
        case 'drop':
            dropPiece(s);
            break;
        case 'delete': {
            const ids = Object.keys(track.edges);
            if (ids.length === 0) return;
            useHistoryStore.getState().record();
            track.removeTrack(ids[s.piece % ids.length]);
            break;
        }
        case 'undo':
            useHistoryStore.getState().undo();
            break;
        case 'redo':
            useHistoryStore.getState().redo();
            break;
        case 'throw': {
            const points = Object.values(track.nodes).filter(n => n.type === 'switch');
            if (points.length > 0) track.toggleSwitch(points[s.points % points.length].id);
            break;
        }
    }
}

/** Everything that makes the track one consistent graph. */
function problems(): string[] {
    const { nodes, edges } = useTrackStore.getState();
    const out: string[] = [];
    for (const e of Object.values(edges)) {
        for (const id of [e.startNodeId, e.endNodeId]) {
            if (!nodes[id]) out.push(`${e.partId} edge ends at a missing node`);
            else if (!nodes[id].connections.includes(e.id)) out.push(`a node doesn't list its ${e.partId} edge`);
        }
    }
    for (const n of Object.values(nodes)) {
        if (n.connections.length === 0) out.push('a node with no track');
        if (new Set(n.connections).size !== n.connections.length) out.push('a node lists an edge twice');
        for (const id of n.connections) if (!edges[id]) out.push('a node lists a missing edge');
        if (n.type === 'switch' && (!n.switchBranches || n.switchBranches.some(b => !n.connections.includes(b)))) {
            out.push('a set of points lost a route');
        }
    }
    return out;
}

function freshTable(): void {
    resetWorld();
    useHistoryStore.getState().clear();
}

describe('building, as a player does it', () => {
    test.prop([fc.array(step, { maxLength: 40 })], { numRuns: 80 })(
        'the track stays one consistent graph, whatever the order',
        (steps) => {
            freshTable();
            for (const [i, s] of steps.entries()) {
                apply(s);
                expect(problems(), `after step ${i}: ${JSON.stringify(s)}`).toEqual([]);
            }
        }
    );

    test.prop([fc.array(drop, { minLength: 1, maxLength: 15 })], { numRuns: 40 })(
        'undoing every drop clears the table, and redoing brings it all back',
        (drops) => {
            freshTable();
            for (const d of drops) dropPiece(d);
            const built = JSON.stringify(useTrackStore.getState().edges);
            for (const _ of drops) useHistoryStore.getState().undo();
            expect(Object.keys(useTrackStore.getState().edges)).toEqual([]);
            expect(Object.keys(useTrackStore.getState().nodes)).toEqual([]);
            for (const _ of drops) useHistoryStore.getState().redo();
            expect(JSON.stringify(useTrackStore.getState().edges)).toBe(built);
            expect(problems()).toEqual([]);
        }
    );
});
