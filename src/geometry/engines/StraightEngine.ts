import type { GeometryEngine } from '../types';
import type { Vector2, BoundingBox } from '../../types';
import { distance, vectorSubtract, vectorAngle, vectorAdd, vectorScale } from '../../utils/vector';

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

        const diff = vectorSubtract(this.end, this.start);
        this.length = distance(this.start, this.end);
        this.angle = vectorAngle(diff);
    }

    getPositionAt(t: number): Vector2 {
        // Clamp t to [0, 1]
        const clampedT = Math.max(0, Math.min(1, t));

        const diff = vectorSubtract(this.end, this.start);
        const offset = vectorScale(diff, clampedT);
        return vectorAdd(this.start, offset);
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
