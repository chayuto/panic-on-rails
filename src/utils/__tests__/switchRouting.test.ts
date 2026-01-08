/**
 * Tests for Switch Routing Utilities
 */

import { describe, it, expect } from 'vitest';
import { getSwitchExitEdge, getDirectionOnNewEdge, isSwitchPassageAllowed } from '../switchRouting';
import type { TrackNode, TrackEdge } from '../../types';

describe('switchRouting', () => {
    describe('getSwitchExitEdge', () => {
        const createSwitchNode = (switchState: 0 | 1): TrackNode => ({
            id: 'switch-1',
            type: 'switch',
            position: { x: 0, y: 0 },
            rotation: 180,
            connections: ['entry-edge', 'main-edge', 'branch-edge'],
            switchState,
            switchBranches: ['main-edge', 'branch-edge'],
        });

        it('returns main edge when entering from entry with state 0', () => {
            const node = createSwitchNode(0);
            const result = getSwitchExitEdge(node, 'entry-edge');
            expect(result).toBe('main-edge');
        });

        it('returns branch edge when entering from entry with state 1', () => {
            const node = createSwitchNode(1);
            const result = getSwitchExitEdge(node, 'entry-edge');
            expect(result).toBe('branch-edge');
        });

        it('returns entry edge when entering from main (trailing point)', () => {
            const node = createSwitchNode(0);  // State doesn't matter for trailing
            const result = getSwitchExitEdge(node, 'main-edge');
            expect(result).toBe('entry-edge');
        });

        it('returns entry edge when entering from branch (trailing point)', () => {
            const node = createSwitchNode(1);  // State doesn't matter for trailing
            const result = getSwitchExitEdge(node, 'branch-edge');
            expect(result).toBe('entry-edge');
        });

        it('returns null for non-switch nodes', () => {
            const node: TrackNode = {
                id: 'junction-1',
                type: 'junction',
                position: { x: 0, y: 0 },
                rotation: 0,
                connections: ['edge-1', 'edge-2'],
            };
            const result = getSwitchExitEdge(node, 'edge-1');
            expect(result).toBeNull();
        });
    });

    describe('getDirectionOnNewEdge', () => {
        const createEdge = (): TrackEdge => ({
            id: 'edge-1',
            startNodeId: 'node-A',
            endNodeId: 'node-B',
            length: 100,
            geometry: { type: 'straight', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
            partId: 'test-part',
        });

        it('returns +1 when entering at start node', () => {
            const edge = createEdge();
            const result = getDirectionOnNewEdge(edge, 'node-A');
            expect(result).toBe(1);
        });

        it('returns -1 when entering at end node', () => {
            const edge = createEdge();
            const result = getDirectionOnNewEdge(edge, 'node-B');
            expect(result).toBe(-1);
        });
    });

    describe('isSwitchPassageAllowed', () => {
        const createSwitchNode = (switchState: 0 | 1): TrackNode => ({
            id: 'switch-1',
            type: 'switch',
            position: { x: 0, y: 0 },
            rotation: 180,
            connections: ['entry-edge', 'main-edge', 'branch-edge'],
            switchState,
            switchBranches: ['main-edge', 'branch-edge'],
        });

        it('allows passage to main when entering from entry with state 0', () => {
            const node = createSwitchNode(0);
            expect(isSwitchPassageAllowed(node, 'entry-edge', 'main-edge')).toBe(true);
            expect(isSwitchPassageAllowed(node, 'entry-edge', 'branch-edge')).toBe(false);
        });

        it('allows passage to branch when entering from entry with state 1', () => {
            const node = createSwitchNode(1);
            expect(isSwitchPassageAllowed(node, 'entry-edge', 'branch-edge')).toBe(true);
            expect(isSwitchPassageAllowed(node, 'entry-edge', 'main-edge')).toBe(false);
        });

        it('allows trailing point passage to entry only', () => {
            const node = createSwitchNode(0);
            // From main, can only go to entry
            expect(isSwitchPassageAllowed(node, 'main-edge', 'entry-edge')).toBe(true);
            expect(isSwitchPassageAllowed(node, 'main-edge', 'branch-edge')).toBe(false);
            // From branch, can only go to entry
            expect(isSwitchPassageAllowed(node, 'branch-edge', 'entry-edge')).toBe(true);
            expect(isSwitchPassageAllowed(node, 'branch-edge', 'main-edge')).toBe(false);
        });

        it('returns true for non-switch nodes', () => {
            const node: TrackNode = {
                id: 'junction-1',
                type: 'junction',
                position: { x: 0, y: 0 },
                rotation: 0,
                connections: ['edge-1', 'edge-2'],
            };
            expect(isSwitchPassageAllowed(node, 'edge-1', 'edge-2')).toBe(true);
        });
    });
});
