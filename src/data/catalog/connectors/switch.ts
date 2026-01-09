/**
 * Switch Track Connectors
 */

import type { ConnectorNode, PartConnectors } from '../../../types/connector';
import type { SwitchGeometry } from '../types';
import { calculateArcEndpoint } from '../../../utils/geometry';

export function computeSwitchConnectors(geometry: SwitchGeometry): PartConnectors {
    // Switch: Entry at origin, main exit straight ahead, branch exit at angle
    const { mainLength, branchRadius, branchLength, branchAngle, branchDirection, isWye } = geometry;
    const branchAngleDir = branchDirection === 'left' ? -1 : 1;
    const branchRad = (branchAngleDir * branchAngle * Math.PI) / 180;

    // Check for wye turnout (symmetric two-way diverge)
    if (isWye && branchRadius !== undefined) {
        // Wye: Entry + two symmetric diverging exits
        // Both branches use the same radius but opposite angles
        const leftBranch = calculateArcEndpoint(0, 0, branchRadius, -branchAngle, 0);
        const rightBranch = calculateArcEndpoint(0, 0, branchRadius, branchAngle, 0);

        const nodes: ConnectorNode[] = [
            {
                localId: 'entry',
                localPosition: { x: 0, y: 0 },
                localFacade: 180,  // Faces back
                maxConnections: 1,
            },
            {
                localId: 'left',
                localPosition: leftBranch.position,
                localFacade: leftBranch.tangentDirection,
                maxConnections: 1,
            },
            {
                localId: 'right',
                localPosition: rightBranch.position,
                localFacade: rightBranch.tangentDirection,
                maxConnections: 1,
            },
        ];
        return { nodes, primaryNodeId: 'entry' };
    }

    // Standard switch: Calculate branch exit position
    // Prefer branchRadius (curved diverge) over branchLength (legacy straight)
    let branchX: number;
    let branchY: number;
    if (branchRadius !== undefined) {
        // Curved diverge: calculate arc endpoint
        // Arc center is perpendicular to entry direction
        const centerY = branchAngleDir * branchRadius;
        const arcAngleRad = (branchAngle * Math.PI) / 180;
        // End point on arc
        branchX = branchRadius * Math.sin(arcAngleRad);
        branchY = centerY - branchAngleDir * branchRadius * Math.cos(arcAngleRad);
    } else if (branchLength !== undefined) {
        // Legacy: straight line to branch exit
        branchX = Math.cos(branchRad) * branchLength;
        branchY = Math.sin(branchRad) * branchLength;
    } else {
        // Fallback: use mainLength as approximation
        branchX = Math.cos(branchRad) * mainLength;
        branchY = Math.sin(branchRad) * mainLength;
    }

    const nodes: ConnectorNode[] = [
        {
            localId: 'entry',
            localPosition: { x: 0, y: 0 },
            localFacade: 180,  // Faces back
            maxConnections: 1,
        },
        {
            localId: 'main',
            localPosition: { x: mainLength, y: 0 },
            localFacade: 0,  // Faces forward
            maxConnections: 1,
        },
        {
            localId: 'branch',
            localPosition: { x: branchX, y: branchY },
            localFacade: branchAngleDir * branchAngle,  // Faces along branch direction
            maxConnections: 1,
        },
    ];
    return { nodes, primaryNodeId: 'entry' };
}
