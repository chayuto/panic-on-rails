/**
 * Curved Track Connectors
 */

import type { ConnectorNode, PartConnectors } from '../../../types/connector';
import type { CurveGeometry } from '../types';

export function computeCurveConnectors(geometry: CurveGeometry): PartConnectors {
    // Curve track: arc that starts heading along +X and turns clockwise
    // (towards +Y, i.e. right on screen). A at origin facing back, B at the
    // arc end facing along the tangent. Mirror-image turns come from snapping
    // connector B instead of A.
    //
    // For a curve with angle θ:
    // - Arc center is perpendicular right of start (radius distance, +Y)
    // - End position follows arc geometry, ahead of A
    // - End facade = θ (pointing outward along arc tangent)
    //
    // Must match createCurveTrack() (see catalogGeometry.test.ts).

    const { radius, angle } = geometry;
    const angleRad = (angle * Math.PI) / 180;

    // Arc center is 90° clockwise from forward direction (down, +Y in screen coords)
    const centerX = 0;  // Start is at origin, center is directly below
    const centerY = radius;

    // End position: rotate from start around center by the arc angle
    // Start is at angle -90° (straight up from center)
    // End is at angle (-90° + curveAngle) from center
    const startAngleFromCenter = -Math.PI / 2;  // 90° up from center
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
