import { describe, test, expect, beforeEach } from 'vitest';
import {
    SpatialHashGrid,
    boundingBoxFromPoints,
    boundingBoxFromArc,
    type BoundingBox
} from '../spatialHashGrid';

describe('SpatialHashGrid', () => {
    let grid: SpatialHashGrid<string>;

    beforeEach(() => {
        // Use 100px cells for easier testing
        grid = new SpatialHashGrid<string>(100);
    });

    describe('insert and query', () => {
        test('insert and query single item', () => {
            grid.insert('a', { x: 50, y: 50, width: 10, height: 10 }, 'item-a');

            const result = grid.query({ x: 0, y: 0, width: 100, height: 100 });
            expect(result).toEqual(['item-a']);
        });

        test('query returns empty array for disjoint rect', () => {
            grid.insert('a', { x: 50, y: 50, width: 10, height: 10 }, 'item-a');

            const result = grid.query({ x: 500, y: 500, width: 100, height: 100 });
            expect(result).toEqual([]);
        });

        test('item spanning multiple cells returned once', () => {
            // Item spans cells (0,0), (0,1), (1,0), (1,1)
            grid.insert('big', { x: 50, y: 50, width: 100, height: 100 }, 'big-item');

            const result = grid.query({ x: 0, y: 0, width: 200, height: 200 });
            expect(result).toEqual(['big-item']);
        });

        test('multiple items in same cell', () => {
            grid.insert('a', { x: 10, y: 10, width: 10, height: 10 }, 'item-a');
            grid.insert('b', { x: 50, y: 50, width: 10, height: 10 }, 'item-b');

            const result = grid.query({ x: 0, y: 0, width: 100, height: 100 });
            expect(result.sort()).toEqual(['item-a', 'item-b'].sort());
        });

        test('query overlapping items returns all overlapping', () => {
            grid.insert('a', { x: 10, y: 10, width: 20, height: 20 }, 'item-a');
            grid.insert('b', { x: 50, y: 50, width: 20, height: 20 }, 'item-b');
            grid.insert('c', { x: 200, y: 200, width: 20, height: 20 }, 'item-c');

            // Query should hit a and b but not c
            const result = grid.query({ x: 0, y: 0, width: 100, height: 100 });
            expect(result.sort()).toEqual(['item-a', 'item-b'].sort());
        });

        test('queryIds returns IDs instead of items', () => {
            grid.insert('a', { x: 10, y: 10, width: 20, height: 20 }, 'item-a');
            grid.insert('b', { x: 50, y: 50, width: 20, height: 20 }, 'item-b');

            const result = grid.queryIds({ x: 0, y: 0, width: 100, height: 100 });
            expect(result.sort()).toEqual(['a', 'b'].sort());
        });
    });

    describe('remove', () => {
        test('remove item from grid', () => {
            grid.insert('a', { x: 50, y: 50, width: 10, height: 10 }, 'item-a');
            grid.remove('a');

            const result = grid.query({ x: 0, y: 0, width: 100, height: 100 });
            expect(result).toEqual([]);
        });

        test('remove non-existent item does not crash', () => {
            expect(() => grid.remove('non-existent')).not.toThrow();
        });

        test('remove item spanning multiple cells', () => {
            grid.insert('big', { x: 50, y: 50, width: 100, height: 100 }, 'big-item');
            grid.remove('big');

            // Should not find it in any cell
            const result = grid.query({ x: 0, y: 0, width: 200, height: 200 });
            expect(result).toEqual([]);
        });
    });

    describe('update', () => {
        test('update item position', () => {
            grid.insert('a', { x: 50, y: 50, width: 10, height: 10 }, 'item-a');
            grid.update('a', { x: 550, y: 550, width: 10, height: 10 });

            // Old position should be empty
            const oldResult = grid.query({ x: 0, y: 0, width: 100, height: 100 });
            expect(oldResult).toEqual([]);

            // New position should have item
            const newResult = grid.query({ x: 500, y: 500, width: 100, height: 100 });
            expect(newResult).toEqual(['item-a']);
        });

        test('update non-existent item does nothing', () => {
            expect(() => grid.update('non-existent', { x: 0, y: 0, width: 10, height: 10 })).not.toThrow();
        });
    });

    describe('clear', () => {
        test('clear removes all items', () => {
            grid.insert('a', { x: 10, y: 10, width: 20, height: 20 }, 'item-a');
            grid.insert('b', { x: 50, y: 50, width: 20, height: 20 }, 'item-b');
            grid.clear();

            const result = grid.query({ x: 0, y: 0, width: 1000, height: 1000 });
            expect(result).toEqual([]);
            expect(grid.size).toBe(0);
        });
    });

    describe('utility properties', () => {
        test('size returns correct count', () => {
            expect(grid.size).toBe(0);

            grid.insert('a', { x: 10, y: 10, width: 10, height: 10 }, 'item-a');
            expect(grid.size).toBe(1);

            grid.insert('b', { x: 50, y: 50, width: 10, height: 10 }, 'item-b');
            expect(grid.size).toBe(2);

            grid.remove('a');
            expect(grid.size).toBe(1);
        });

        test('has returns correct boolean', () => {
            expect(grid.has('a')).toBe(false);

            grid.insert('a', { x: 10, y: 10, width: 10, height: 10 }, 'item-a');
            expect(grid.has('a')).toBe(true);

            grid.remove('a');
            expect(grid.has('a')).toBe(false);
        });

        test('getBounds returns stored bounds', () => {
            const bounds: BoundingBox = { x: 10, y: 20, width: 30, height: 40 };
            grid.insert('a', bounds, 'item-a');

            expect(grid.getBounds('a')).toEqual(bounds);
            expect(grid.getBounds('non-existent')).toBeUndefined();
        });

        test('getAllIds returns all item IDs', () => {
            grid.insert('a', { x: 10, y: 10, width: 10, height: 10 }, 'item-a');
            grid.insert('b', { x: 50, y: 50, width: 10, height: 10 }, 'item-b');
            grid.insert('c', { x: 200, y: 200, width: 10, height: 10 }, 'item-c');

            expect(grid.getAllIds().sort()).toEqual(['a', 'b', 'c'].sort());
        });
    });

    describe('edge cases', () => {
        test('item at negative coordinates', () => {
            grid.insert('neg', { x: -50, y: -50, width: 10, height: 10 }, 'item-neg');

            const result = grid.query({ x: -100, y: -100, width: 100, height: 100 });
            expect(result).toEqual(['item-neg']);
        });

        test('very large item', () => {
            grid.insert('huge', { x: 0, y: 0, width: 1000, height: 1000 }, 'item-huge');

            const result = grid.query({ x: 500, y: 500, width: 100, height: 100 });
            expect(result).toEqual(['item-huge']);
        });

        test('duplicate insert updates item', () => {
            grid.insert('a', { x: 10, y: 10, width: 10, height: 10 }, 'item-a-v1');
            grid.insert('a', { x: 200, y: 200, width: 10, height: 10 }, 'item-a-v2');

            // Should be at new position only
            const oldResult = grid.query({ x: 0, y: 0, width: 100, height: 100 });
            expect(oldResult).toEqual([]);

            const newResult = grid.query({ x: 200, y: 200, width: 100, height: 100 });
            expect(newResult).toEqual(['item-a-v2']);
        });
    });
});

describe('boundingBoxFromPoints', () => {
    test('creates bounding box from two points', () => {
        const box = boundingBoxFromPoints({ x: 10, y: 20 }, { x: 100, y: 80 });

        expect(box).toEqual({
            x: 10,
            y: 20,
            width: 90,
            height: 60,
        });
    });

    test('handles points in reverse order', () => {
        const box = boundingBoxFromPoints({ x: 100, y: 80 }, { x: 10, y: 20 });

        expect(box).toEqual({
            x: 10,
            y: 20,
            width: 90,
            height: 60,
        });
    });

    test('handles same point (minimum size)', () => {
        const box = boundingBoxFromPoints({ x: 50, y: 50 }, { x: 50, y: 50 });

        expect(box.width).toBe(1); // Minimum width
        expect(box.height).toBe(1); // Minimum height
    });

    test('applies padding', () => {
        const box = boundingBoxFromPoints({ x: 10, y: 10 }, { x: 20, y: 20 }, 5);

        expect(box).toEqual({
            x: 5,
            y: 5,
            width: 20,
            height: 20,
        });
    });
});

describe('boundingBoxFromArc', () => {
    test('creates bounding box for arc', () => {
        const box = boundingBoxFromArc({ x: 100, y: 100 }, 50, 0, Math.PI / 2);

        expect(box).toEqual({
            x: 50,
            y: 50,
            width: 100,
            height: 100,
        });
    });

    test('applies padding', () => {
        const box = boundingBoxFromArc({ x: 100, y: 100 }, 50, 0, Math.PI / 2, 10);

        expect(box).toEqual({
            x: 40,
            y: 40,
            width: 120,
            height: 120,
        });
    });
});
