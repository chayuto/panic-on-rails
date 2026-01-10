import { LayoutDataSchema } from './layout';

describe('LayoutDataSchema', () => {
    it('validates a correct layout', () => {
        const validLayout = {
            version: 1,
            nodes: {
                'node1': {
                    id: 'node1',
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    connections: ['edge1'],
                    type: 'endpoint' as const,
                },
                'node2': {
                    id: 'node2',
                    position: { x: 100, y: 0 },
                    rotation: 180,
                    connections: ['edge1'],
                    type: 'endpoint' as const,
                }
            },
            edges: {
                'edge1': {
                    id: 'edge1',
                    partId: 'track1',
                    startNodeId: 'node1',
                    endNodeId: 'node2',
                    geometry: {
                        type: 'straight' as const,
                        start: { x: 0, y: 0 },
                        end: { x: 100, y: 0 }
                    },
                    length: 100
                }
            }
        };

        const result = LayoutDataSchema.safeParse(validLayout);
        expect(result.success).toBe(true);
    });

    it('rejects layout with missing required fields', () => {
        const invalidLayout = {
            version: 1,
            // missing nodes and edges
        };

        const result = LayoutDataSchema.safeParse(invalidLayout);
        expect(result.success).toBe(false);
    });

    it('validates nested geometry types', () => {
        const invalidGeometry = {
            version: 1,
            nodes: {},
            edges: {
                'edge1': {
                    id: 'edge1',
                    partId: 'track1',
                    startNodeId: 'n1',
                    endNodeId: 'n2',
                    geometry: {
                        type: 'unknown_type', // Invalid type
                    }
                }
            }
        };

        const result = LayoutDataSchema.safeParse(invalidGeometry);
        expect(result.success).toBe(false);
    });
});
