/**
 * Connector Strategy Factory
 * 
 * Dispatches connector computation to appropriate strategy based on geometry type.
 */

import type { PartDefinition } from '../types';
import type { PartConnectors, ConnectorNode } from '../../../types/connector';
import { computeStraightConnectors } from './straight';
import { computeCurveConnectors } from './curve';
import { computeSwitchConnectors } from './switch';
import { computeCrossingConnectors } from './crossing';

export function computeConnectors(part: PartDefinition): PartConnectors {
    const geometry = part.geometry;

    switch (geometry.type) {
        case 'straight':
            return computeStraightConnectors(geometry);
        case 'curve':
            return computeCurveConnectors(geometry);
        case 'switch':
            return computeSwitchConnectors(geometry);
        case 'crossing':
            return computeCrossingConnectors(geometry);
        default: {
            // Fallback for unknown geometry types
            const nodes: ConnectorNode[] = [
                {
                    localId: 'A',
                    localPosition: { x: 0, y: 0 },
                    localFacade: 180,
                    maxConnections: 1,
                },
            ];
            return { nodes, primaryNodeId: 'A' };
        }
    }
}
