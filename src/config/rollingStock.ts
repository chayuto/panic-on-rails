/**
 * Rolling stock dimensions, N scale (mm; a bigger scale grows them).
 *
 * A train runs its model's own cars, each as long as the real model over
 * its couplers (`carLengths` in data/rollingStock.ts). The car here is the
 * short uniform one a train without lengths gets (a test's). Widths are the
 * same for every car. Rendering and physics both read these.
 *
 * A train's position (edge + distance) is its leading car's front bogie;
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

/** Where a car's bogies sit: this far in from each end, as a share of its body. */
export const BOGIE_INSET_RATIO = ROLLING_STOCK.BOGIE_INSET / ROLLING_STOCK.CAR_LENGTH;

/** Distance between the front bogies of consecutive cars. */
export const CAR_PITCH = ROLLING_STOCK.CAR_LENGTH + ROLLING_STOCK.GAP;

/** Distance between a car's two bogies. */
export const BOGIE_SPACING = ROLLING_STOCK.CAR_LENGTH - 2 * ROLLING_STOCK.BOGIE_INSET;

/** How many edges of route history a train keeps for placing its cars. */
export const TRAIL_LENGTH = 16;
