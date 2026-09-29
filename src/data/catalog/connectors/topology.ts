/**
 * Topology Part Connectors: from the same route walk the track creator uses.
 */

import type { ConnectorNode, PartConnectors } from '../../../types/connector';
import type { TopologyGeometry } from '../types';
import { resolveTopology } from '../topology';

export function computeTopologyConnectors(geometry: TopologyGeometry): PartConnectors {
    const topology = resolveTopology(geometry);
    const nodes: ConnectorNode[] = topology.connectors.map(c => ({
        localId: c.id,
        localPosition: { x: c.x, y: c.y },
        localFacade: c.facade,
        maxConnections: 1,
    }));
    return { nodes, primaryNodeId: topology.primary };
}
