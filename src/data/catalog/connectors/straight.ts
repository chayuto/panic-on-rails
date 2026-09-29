/**
 * Straight Track Connectors
 */

import type { ConnectorNode, PartConnectors } from '../../../types/connector';
import type { StraightGeometry } from '../types';

export function computeStraightConnectors(geometry: StraightGeometry): PartConnectors {
    // Straight track: A at origin facing back, B at end facing forward
    // Origin is at A (start), B is at (length, 0)
    const nodes: ConnectorNode[] = [
        {
            localId: 'A',
            localPosition: { x: 0, y: 0 },
            localFacade: 180,  // Faces left/back
            maxConnections: 1,
        },
        {
            localId: 'B',
            localPosition: { x: geometry.length, y: 0 },
            localFacade: 0,  // Faces right/forward
            maxConnections: 1,
        },
    ];
    // A bumper's far end is a buffer stop, not something to connect to
    return { nodes: geometry.bumper ? nodes.slice(0, 1) : nodes, primaryNodeId: 'A' };
}
