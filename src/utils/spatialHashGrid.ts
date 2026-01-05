/**
 * SpatialHashGrid - O(1) spatial indexing for viewport culling
 * 
 * This data structure divides the world into fixed-size cells and stores
 * items in the cells they overlap. This enables efficient queries for
 * items within a given rectangular region.
 * 
 * @template T - The type of items stored in the grid
 */

import type { Vector2 } from '../types';

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class SpatialHashGrid<T> {
    private cellSize: number;
    private cells: Map<string, Map<string, T>>;
    private itemToCells: Map<string, string[]>;
    private itemBounds: Map<string, BoundingBox>;

    /**
     * Create a new SpatialHashGrid
     * @param cellSize - Size of each cell in pixels (default 500)
     */
    constructor(cellSize: number = 500) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.itemToCells = new Map();
        this.itemBounds = new Map();
    }

    /**
     * Get the cell keys that overlap with a given bounding box
     */
    private _getCellKeys(bounds: BoundingBox): string[] {
        const startX = Math.floor(bounds.x / this.cellSize);
        const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
        const startY = Math.floor(bounds.y / this.cellSize);
        const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);

        const keys: string[] = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                keys.push(`${x},${y}`);
            }
        }
        return keys;
    }

    /**
     * Insert an item into the grid
     * @param id - Unique identifier for the item
     * @param bounds - Bounding box of the item
     * @param item - The item to store
     */
    insert(id: string, bounds: BoundingBox, item: T): void {
        // Remove existing entry if present (prevents duplicates)
        if (this.itemToCells.has(id)) {
            this.remove(id);
        }

        const keys = this._getCellKeys(bounds);
        this.itemToCells.set(id, keys);
        this.itemBounds.set(id, bounds);

        for (const key of keys) {
            if (!this.cells.has(key)) {
                this.cells.set(key, new Map());
            }
            this.cells.get(key)!.set(id, item);
        }
    }

    /**
     * Remove an item from the grid
     * @param id - Unique identifier of the item to remove
     */
    remove(id: string): void {
        const keys = this.itemToCells.get(id);
        if (!keys) return;

        for (const key of keys) {
            const cell = this.cells.get(key);
            if (cell) {
                cell.delete(id);
                // Clean up empty cells to save memory
                if (cell.size === 0) {
                    this.cells.delete(key);
                }
            }
        }
        this.itemToCells.delete(id);
        this.itemBounds.delete(id);
    }

    /**
     * Update an item's position in the grid
     * @param id - Unique identifier of the item
     * @param newBounds - New bounding box
     */
    update(id: string, newBounds: BoundingBox): void {
        const item = this._getItem(id);
        if (item === undefined) return;

        this.remove(id);
        this.insert(id, newBounds, item);
    }

    /**
     * Get an item by its ID (internal helper)
     */
    private _getItem(id: string): T | undefined {
        const keys = this.itemToCells.get(id);
        if (!keys || keys.length === 0) return undefined;
        return this.cells.get(keys[0])?.get(id);
    }

    /**
     * Query for all items within a rectangular region
     * @param rect - The query rectangle
     * @returns Array of items that overlap the rectangle
     */
    query(rect: BoundingBox): T[] {
        const keys = this._getCellKeys(rect);
        const result = new Map<string, T>();

        for (const key of keys) {
            const cell = this.cells.get(key);
            if (cell) {
                for (const [id, item] of cell) {
                    result.set(id, item);
                }
            }
        }

        return Array.from(result.values());
    }

    /**
     * Query for all item IDs within a rectangular region
     * @param rect - The query rectangle
     * @returns Array of item IDs that overlap the rectangle
     */
    queryIds(rect: BoundingBox): string[] {
        const keys = this._getCellKeys(rect);
        const result = new Set<string>();

        for (const key of keys) {
            const cell = this.cells.get(key);
            if (cell) {
                for (const id of cell.keys()) {
                    result.add(id);
                }
            }
        }

        return Array.from(result);
    }

    /**
     * Clear all items from the grid
     */
    clear(): void {
        this.cells.clear();
        this.itemToCells.clear();
        this.itemBounds.clear();
    }

    /**
     * Get the number of items in the grid
     */
    get size(): number {
        return this.itemToCells.size;
    }

    /**
     * Check if an item exists in the grid
     */
    has(id: string): boolean {
        return this.itemToCells.has(id);
    }

    /**
     * Get the bounds of an item
     */
    getBounds(id: string): BoundingBox | undefined {
        return this.itemBounds.get(id);
    }

    /**
     * Get all item IDs in the grid
     */
    getAllIds(): string[] {
        return Array.from(this.itemToCells.keys());
    }
}

/**
 * Helper function to calculate bounding box from two points
 */
export function boundingBoxFromPoints(
    p1: Vector2,
    p2: Vector2,
    padding: number = 0
): BoundingBox {
    const minX = Math.min(p1.x, p2.x) - padding;
    const minY = Math.min(p1.y, p2.y) - padding;
    const maxX = Math.max(p1.x, p2.x) + padding;
    const maxY = Math.max(p1.y, p2.y) + padding;

    return {
        x: minX,
        y: minY,
        width: maxX - minX || 1, // Ensure minimum width of 1
        height: maxY - minY || 1, // Ensure minimum height of 1
    };
}

/**
 * Helper function to calculate bounding box for an arc
 */
export function boundingBoxFromArc(
    center: Vector2,
    radius: number,
    _startAngle: number,
    _endAngle: number,
    padding: number = 0
): BoundingBox {
    // Conservative bounding box using the full circle
    // A more precise calculation would check which quadrants the arc passes through
    return {
        x: center.x - radius - padding,
        y: center.y - radius - padding,
        width: radius * 2 + padding * 2,
        height: radius * 2 + padding * 2,
    };
}
