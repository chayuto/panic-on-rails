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
        const startPos = this.getPositionAt(0);
        const endPos = this.getPositionAt(1);

        let minX = Math.min(startPos.x, endPos.x);
        let maxX = Math.max(startPos.x, endPos.x);
        let minY = Math.min(startPos.y, endPos.y);
        let maxY = Math.max(startPos.y, endPos.y);

        // Check cardinal angles (0°, 90°, 180°, 270°) — if any falls within
        // the swept range, the arc reaches the full radius in that direction.
        const cardinals = [0, 90, 180, 270];
        for (const cardinal of cardinals) {
            if (this.isAngleInSweep(cardinal)) {
                const rad = degreesToRadians(cardinal);
                const px = this.center.x + Math.cos(rad) * this.radius;
                const py = this.center.y + Math.sin(rad) * this.radius;
                minX = Math.min(minX, px);
                maxX = Math.max(maxX, px);
                minY = Math.min(minY, py);
                maxY = Math.max(maxY, py);
            }
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }

    /** Check if a given angle (degrees) lies within the arc's swept range */
    private isAngleInSweep(angle: number): boolean {
        // Normalize the test angle relative to startAngle
        let rel = angle - this.startAngle;
        // Normalize to (-360, 360)
        rel = ((rel % 360) + 360) % 360;
        if (this.sweepAngle >= 0) {
            // CCW sweep: angle is in range if rel is in [0, sweepAngle]
            return rel <= this.sweepAngle;
        } else {
            // CW sweep: angle is in range if rel is in [360+sweepAngle, 360]
            // (sweepAngle is negative, so 360+sweepAngle < 360)
            return rel >= 360 + this.sweepAngle;
        }
    }

    getParameterAtDistance(distance: number): number {
        if (this.length === 0) return 0;
        return Math.max(0, Math.min(1, distance / this.length));
    }
}
