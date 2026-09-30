import { describe, it, expect } from 'vitest';
import { formatClock } from '../railwayClock';

describe('formatClock', () => {
    it('reads railway seconds as m:ss, and h:mm:ss past the hour', () => {
        expect(formatClock(0)).toBe('0:00');
        expect(formatClock(45)).toBe('0:45');
        expect(formatClock(75.9)).toBe('1:15');
        expect(formatClock(3725)).toBe('1:02:05');
        expect(formatClock(-3)).toBe('0:00');
    });
});
