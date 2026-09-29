/**
 * Rolling stock dimensions at game scale (mm).
 *
 * Real N-scale cars are 100–150mm long; these are shortened so a train fits
 * a starter-set oval, and kept in proportion to the 9mm gauge and the 25mm
 * roadbed. Rendering and physics both read them.
 *
 * A train's position (edge + distance) is its locomotive's front bogie;
 * every other bogie trails behind it along the route it took.
 */
export const ROLLING_STOCK = {
    CAR_LENGTH: 44,
    CAR_WIDTH: 15,
    /** From a bogie's centre to the nearer end of the car */
    BOGIE_INSET: 8,
    /** Coupler gap between cars */
    GAP: 4,
} as const;

/** Distance between the front bogies of consecutive cars. */
export const CAR_PITCH = ROLLING_STOCK.CAR_LENGTH + ROLLING_STOCK.GAP;

/** Distance between a car's two bogies. */
export const BOGIE_SPACING = ROLLING_STOCK.CAR_LENGTH - 2 * ROLLING_STOCK.BOGIE_INSET;

/** How many edges of route history a train keeps for placing its cars. */
export const TRAIL_LENGTH = 16;
