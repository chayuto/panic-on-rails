/**
 * Tests for Collision Manager with multi-car train support
 */

import { describe, it, expect } from 'vitest';
import { detectCollisions, getTrainLength } from '../collisionManager';
import type { Train } from '../../types';

describe('collisionManager', () => {
    describe('getTrainLength', () => {
        it('should return 0 for single carriage train', () => {
            const train: Train = {
                id: 'train-1',
                currentEdgeId: 'edge-1',
                distanceAlongEdge: 50,
                direction: 1,
                speed: 100,
                color: '#FF0000',
                carriageCount: 1,
                carriageSpacing: 30,
            };

            expect(getTrainLength(train)).toBe(0);
        });

        it('should return correct length for multi-carriage train', () => {
            const train: Train = {
                id: 'train-1',
                currentEdgeId: 'edge-1',
                distanceAlongEdge: 50,
                direction: 1,
                speed: 100,
                color: '#FF0000',
                carriageCount: 3,
                carriageSpacing: 30,
            };

            // (3 - 1) * 30 = 60
            expect(getTrainLength(train)).toBe(60);
        });

        it('should use default values when properties are undefined', () => {
            const train: Train = {
                id: 'train-1',
                currentEdgeId: 'edge-1',
                distanceAlongEdge: 50,
                direction: 1,
                speed: 100,
                color: '#FF0000',
            };

            // Default carriageCount is 1, so length is 0
            expect(getTrainLength(train)).toBe(0);
        });
    });

    describe('detectCollisions', () => {
        it('should detect collision between single-car trains on same edge', () => {
            const trains: Record<string, Train> = {
                'train-1': {
                    id: 'train-1',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 50,
                    direction: 1,
                    speed: 100,
                    color: '#FF0000',
                    carriageCount: 1,
                },
                'train-2': {
                    id: 'train-2',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 55,
                    direction: -1,
                    speed: 100,
                    color: '#00FF00',
                    carriageCount: 1,
                },
            };

            const collisions = detectCollisions(trains);
            expect(collisions).toHaveLength(1);
            expect(collisions[0].edgeId).toBe('edge-1');
        });

        it('should not detect collision between trains on different edges', () => {
            const trains: Record<string, Train> = {
                'train-1': {
                    id: 'train-1',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 50,
                    direction: 1,
                    speed: 100,
                    color: '#FF0000',
                },
                'train-2': {
                    id: 'train-2',
                    currentEdgeId: 'edge-2',
                    distanceAlongEdge: 50,
                    direction: 1,
                    speed: 100,
                    color: '#00FF00',
                },
            };

            const collisions = detectCollisions(trains);
            expect(collisions).toHaveLength(0);
        });

        it('should not detect collision between trains far apart on same edge', () => {
            const trains: Record<string, Train> = {
                'train-1': {
                    id: 'train-1',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 10,
                    direction: 1,
                    speed: 100,
                    color: '#FF0000',
                    carriageCount: 1,
                },
                'train-2': {
                    id: 'train-2',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 100,
                    direction: 1,
                    speed: 100,
                    color: '#00FF00',
                    carriageCount: 1,
                },
            };

            const collisions = detectCollisions(trains);
            expect(collisions).toHaveLength(0);
        });

        it('should detect collision between multi-car trains at longer distance', () => {
            // Two 5-car trains with 30px spacing each have length of 4 * 30 = 120px each
            // Effective threshold = 15 + 60 + 60 = 135px
            const trains: Record<string, Train> = {
                'train-1': {
                    id: 'train-1',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 0,
                    direction: 1,
                    speed: 100,
                    color: '#FF0000',
                    carriageCount: 5,
                    carriageSpacing: 30,
                },
                'train-2': {
                    id: 'train-2',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 100, // Within 135px threshold
                    direction: -1,
                    speed: 100,
                    color: '#00FF00',
                    carriageCount: 5,
                    carriageSpacing: 30,
                },
            };

            const collisions = detectCollisions(trains);
            expect(collisions).toHaveLength(1);
        });

        it('should skip crashed trains in collision detection', () => {
            const trains: Record<string, Train> = {
                'train-1': {
                    id: 'train-1',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 50,
                    direction: 1,
                    speed: 100,
                    color: '#FF0000',
                    crashed: true,
                },
                'train-2': {
                    id: 'train-2',
                    currentEdgeId: 'edge-1',
                    distanceAlongEdge: 55,
                    direction: -1,
                    speed: 100,
                    color: '#00FF00',
                },
            };

            const collisions = detectCollisions(trains);
            expect(collisions).toHaveLength(0);
        });
    });
});
