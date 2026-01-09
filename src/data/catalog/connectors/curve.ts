/**
 * Curved Track Connectors
 */

import type { ConnectorNode, PartConnectors } from '../../../types/connector';
import type { CurveGeometry } from '../types';

export function computeCurveConnectors(geometry: CurveGeometry): PartConnectors {
    // Curve track: LEFT-curving arc
    // A at origin facing back, B at arc end facing tangent direction
    // 
    // For a LEFT curve with angle θ:
    // - Arc center is perpendicular left of start (at radius distance up)
    // - End position follows arc geometry
    // - End facade = θ (pointing outward along arc tangent)

    const { radius, angle } = geometry;
    const angleRad = (angle * Math.PI) / 180;

    // Arc center is 90° counter-clockwise from forward direction (up, negative Y in screen coords)
    const centerX = 0;  // Start is at origin, center is directly above
    const centerY = -radius;

    // End position: rotate from start around center by the arc angle
    // Start is at angle 90° (pointing down from center)
    // End is at angle (90° + curveAngle) from center
    const startAngleFromCenter = Math.PI / 2;  // 90° down from center
    const endAngleFromCenter = startAngleFromCenter + angleRad;

    const endX = centerX + Math.cos(endAngleFromCenter) * radius;
    const endY = centerY + Math.sin(endAngleFromCenter) * radius;

    const nodes: ConnectorNode[] = [
        {
            localId: 'A',
            localPosition: { x: 0, y: 0 },
            localFacade: 180,  // Faces back (left)
            maxConnections: 1,
        },
        {
            localId: 'B',
            localPosition: { x: endX, y: endY },
            localFacade: angle,  // Faces tangent direction at end
            maxConnections: 1,
        },
    ];
    return { nodes, primaryNodeId: 'A' };
}
