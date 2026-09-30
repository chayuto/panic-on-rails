/**
 * Catalog part helpers: a part's connectors, and the parts-bin section it
 * belongs to.
 */

import type { PartDefinition, PartCategory } from './types';
import type { PartConnectors } from '../../types/connector';
export { calculateArcLength, calculateArcEndpoint } from '../../utils/geometry';

// Import the strategy factory
import { computeConnectors as computeConnectorsStrategy } from './connectors';

// ===========================
// Connector Computation
// ===========================

/**
 * Compute connector nodes from part geometry.
 * This provides backward compatibility for parts without explicit connector definitions.
 * 
 * Delegates to the strategy pattern implementation.
 */
export function computeConnectors(part: PartDefinition): PartConnectors {
    return computeConnectorsStrategy(part);
}

/**
 * Get connectors for a part, using explicit definition if available,
 * otherwise computing from geometry.
 */
export function getPartConnectors(part: PartDefinition): PartConnectors {
    // Future: Check for part.connectors explicit definition
    // For now, always compute from geometry
    return computeConnectors(part);
}

// ===========================
// Categories
// ===========================

/**
 * A double-track piece: two tracks side by side, sharing no connector, filed
 * as a straight or a curve (Kato's WS and WR pieces).
 */
export function isDoubleTrack(part: PartDefinition): boolean {
    const g = part.geometry;
    return g.type === 'topology' && g.routes.length === 2
        && (part.category === 'straight' || part.category === 'curve');
}

/**
 * The parts-bin section a part belongs to: its own `category`, or one
 * worked out from its geometry (a topology part with points is a turnout).
 */
export function partCategory(part: PartDefinition): PartCategory {
    if (part.category) return part.category;
    const g = part.geometry;
    switch (g.type) {
        case 'straight': return g.bumper ? 'bumper' : 'straight';
        case 'curve': return 'curve';
        case 'switch': return 'turnout';
        case 'crossing':
        case 'compound': return 'crossing';
        case 'topology': {
            // Two tracks that never share a connector (a double crossover's, a
            // double slip's) make a crossing; routes that split make a turnout
            const apart = g.routes.some((a, i) => g.routes.slice(i + 1).some(b =>
                ![b.from, b.to].includes(a.from) && ![b.from, b.to].includes(a.to)));
            return apart ? 'crossing' : 'turnout';
        }
    }
}
