import type { GeometryEngine } from '../types';
import type { Vector2, BoundingBox } from '../../types';
import { normalizeAngle, radiansToDegrees } from '../../utils/angle';

interface StraightGeometryData {
    start: Vector2;
    end: Vector2;
}

export class StraightEngine implements GeometryEngine {
    private start: Vector2;
    private end: Vector2;
    private length: number;
    private angle: number;

    constructor(geometry: StraightGeometryData) {
        this.start = geometry.start;
        this.end = geometry.end;

        const dx = this.end.x - this.start.x;
        const dy = this.end.y - this.start.y;

        this.length = Math.sqrt(dx * dx + dy * dy);
        this.angle = normalizeAngle(radiansToDegrees(Math.atan2(dy, dx)));
    }

    getPositionAt(t: number): Vector2 {
        // Clamp t to [0, 1]
        const clampedT = Math.max(0, Math.min(1, t));

        return {
            x: this.start.x + (this.end.x - this.start.x) * clampedT,
            y: this.start.y + (this.end.y - this.start.y) * clampedT
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getTangentAt(_t: number): number {
        // Tangent is constant for a straight line
        return this.angle;
    }

    getLength(): number {
        return this.length;
    }

    getBounds(): BoundingBox {
        const minX = Math.min(this.start.x, this.end.x);
        const maxX = Math.max(this.start.x, this.end.x);
        const minY = Math.min(this.start.y, this.end.y);
        const maxY = Math.max(this.start.y, this.end.y);

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
