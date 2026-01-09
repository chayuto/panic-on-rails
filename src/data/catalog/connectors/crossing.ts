/**
 * Crossing Track Connectors
 */

import type { ConnectorNode, PartConnectors } from '../../../types/connector';
import type { CrossingGeometry } from '../types';

export function computeCrossingConnectors(geometry: CrossingGeometry): PartConnectors {
    // Crossing: Two tracks crossing at center
    // Path A: horizontal, Path B: at crossingAngle
    const { length, crossingAngle } = geometry;
    const halfLength = length / 2;
    const crossRad = (crossingAngle * Math.PI) / 180;

    const nodes: ConnectorNode[] = [
        // Path A (horizontal)
        {
            localId: 'A1',
            localPosition: { x: -halfLength, y: 0 },
            localFacade: 180,
            maxConnections: 1,
        },
        {
            localId: 'A2',
            localPosition: { x: halfLength, y: 0 },
            localFacade: 0,
            maxConnections: 1,
        },
        // Path B (at crossingAngle)
        {
            localId: 'B1',
            localPosition: {
                x: -Math.cos(crossRad) * halfLength,
                y: -Math.sin(crossRad) * halfLength,
            },
            localFacade: crossingAngle + 180,
            maxConnections: 1,
        },
        {
            localId: 'B2',
            localPosition: {
                x: Math.cos(crossRad) * halfLength,
                y: Math.sin(crossRad) * halfLength,
            },
            localFacade: crossingAngle,
            maxConnections: 1,
        },
    ];
    return { nodes, primaryNodeId: 'A1' };
}
