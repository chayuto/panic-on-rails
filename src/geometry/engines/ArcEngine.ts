import type { GeometryEngine } from '../types';
import type { Vector2, BoundingBox } from '../../types';
import { normalizeAngle, degreesToRadians } from '../../utils/angle';

interface ArcGeometryData {
    center: Vector2;
    radius: number;
    startAngle: number;
    endAngle: number;
}

export class ArcEngine implements GeometryEngine {
    private center: Vector2;
    private radius: number;
    private startAngle: number;
    private endAngle: number;
    private sweepAngle: number;
    private length: number;
    private isCounterClockwise: boolean;

    constructor(geometry: ArcGeometryData) {
        this.center = geometry.center;
        this.radius = geometry.radius;
        this.startAngle = geometry.startAngle;
        this.endAngle = geometry.endAngle;

        // Calculate sweep
        this.sweepAngle = this.endAngle - this.startAngle;
        this.isCounterClockwise = this.sweepAngle >= 0;

        // Arc length = r * |theta_rad|
        const sweepRad = degreesToRadians(Math.abs(this.sweepAngle));
        this.length = this.radius * sweepRad;
    }

    getPositionAt(t: number): Vector2 {
        const clampedT = Math.max(0, Math.min(1, t));

        // Interpolate angle
        const currentAngle = this.startAngle + this.sweepAngle * clampedT;
        const rad = degreesToRadians(currentAngle);

        return {
            x: this.center.x + Math.cos(rad) * this.radius,
            y: this.center.y + Math.sin(rad) * this.radius
        };
    }

    getTangentAt(t: number): number {
        const clampedT = Math.max(0, Math.min(1, t));

        // Tangent of a circle is perpendicular to the radius
        const currentAngle = this.startAngle + this.sweepAngle * clampedT;

        // CCW: Tangent is +90 relative to radial vector
        // CW: Tangent is -90 relative to radial vector
        const tangentOffset = this.isCounterClockwise ? 90 : -90;

        return normalizeAngle(currentAngle + tangentOffset);
    }

    getLength(): number {
        return this.length;
    }

    getBounds(): BoundingBox {
        // Precise bounding box for an arc is complex (min/max x/y could be at endpoints or at cardinal angles)
        // For now, we'll use a simplified bounding box enclosing start and end points
        // TODO: Improve to check cardinal points (0, 90, 180, 270) if they lie within the arc

        // Quick approximation: include start, end, and center+/-radius
        // This is a loose bound but safe for frustration culling

        const startPos = this.getPositionAt(0);
        const endPos = this.getPositionAt(1);

        // Check if cardinal directions are included in the sweep
        // This is non-trivial due to angle wrapping, might implement later if culling needs it

        const minX = Math.min(startPos.x, endPos.x);
        const maxX = Math.max(startPos.x, endPos.x);
        const minY = Math.min(startPos.y, endPos.y);
        const maxY = Math.max(startPos.y, endPos.y);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    getParameterAtDistance(distance: number): number {
        if (this.length === 0) return 0;
        return Math.max(0, Math.min(1, distance / this.length));
    }
}
