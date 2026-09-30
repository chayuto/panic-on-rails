/**
 * Boxed sets — the real products a modeler buys: a starter set with an oval
 * of track, or an expansion that turns it into something bigger.
 *
 * A set lists exactly what's in the real box (catalog part × quantity) and
 * the layout plans printed in its manual. Plans are chains of parts, not
 * coordinates, so they are always built from catalog geometry.
 */

import type { PartBrand, PartScale } from '../catalog/types';

/** How the manufacturer positions the box. */
export type SetKind =
    | 'starter'     // Complete oval (often with a power pack): where everyone begins
    | 'expansion';  // Adds to a starter set: sidings, loops, stations

/** One line of the box's contents list. */
export interface SetContentItem {
    /** Catalog part id, e.g. 'kato-20-000' */
    part: string;
    qty: number;
}

/**
 * Where a plan step attaches: a connector on an earlier piece.
 * `piece` is a step index into the same plan.
 */
export interface PlanAnchor {
    piece: number;
    connector: string;
}

/**
 * Start a new, separate run of track parallel to an earlier piece: placed
 * exactly like `alongside`, shifted `offset` mm to the right of its direction
 * (negative = left). E.g. Kato V5's inner oval runs 33 mm inside the M1 oval.
 */
export interface PlanAlongside {
    alongside: number;
    offset: number;
}

/**
 * One piece of track in a layout plan.
 *
 * Reads like the manual: "add an S248 to the previous piece", "add a
 * R315-45 curve", "on the turnout's branch, add a R718-15".
 */
export interface PlanStep {
    /** Catalog part id */
    part: string;
    /**
     * Where to attach. A number is an earlier step's index (its through
     * exit); an anchor names the connector. Default: the previous step's
     * through exit. The first step is placed at the plan origin.
     * `{ alongside, offset }` starts a parallel run instead of attaching.
     */
    at?: number | PlanAnchor | PlanAlongside;
    /**
     * Which of this part's connectors mates with `at`. Default: the part's
     * primary connector ('A' / 'entry'). Curves turn right from A; attach a
     * curve via 'B' to turn left.
     */
    via?: string;
    /**
     * How high its far end stands (mm above the baseboard, as on a pier):
     * the piece is a grade from the height it's attached at. Default: level
     * with where it's attached. The first step starts on the baseboard.
     */
    height?: number;
}

/** A train the plan puts on the track once it's built. */
export interface PlanTrain {
    /** Step index whose track the train starts on */
    piece: number;
    color?: string;
    /** The rolling stock to run (data/rollingStock), e.g. the set's own train */
    stock?: string;
}

/** A layout printed in the set's manual. */
export interface LayoutPlan {
    id: string;
    name: string;
    description?: string;
    steps: PlanStep[];
    trains?: PlanTrain[];
    /**
     * Connectors intentionally left open (e.g. a siding waiting for the next
     * expansion). Tests fail on any other gap.
     */
    openEnds?: number;
    /**
     * Largest gap (mm) allowed where two connectors meet. Default 0.5. Some
     * real plans are a millimetre or two off on paper and close thanks to
     * UniJoiner play (e.g. #4 and #6 sidings); say why in `description`.
     * At most 3.
     */
    tolerance?: number;
}

/** A real boxed product. */
export interface TrackSet {
    /** Unique id: `${brand}-${productCode}` */
    id: string;
    brand: PartBrand;
    scale: PartScale;
    /** Manufacturer's product number, as printed on the box */
    productCode: string;
    /** Short label printed on the box, e.g. 'M1', 'V1' */
    badge?: string;
    name: string;
    kind: SetKind;
    description: string;
    /** Track pieces in the box */
    contents: SetContentItem[];
    /** Other things in the box (power pack, turnout controllers, tools) */
    accessories?: string[];
    /** The trains in the box, as rolling stock ids (data/rollingStock): a train set's own train */
    rollingStock?: string[];
    /**
     * Pieces in the box that none of the plans need (e.g. the spare S60 cut
     * straights of a #4 set). Also listed in `contents`.
     */
    spares?: SetContentItem[];
    /** Sets this one is designed to extend. Its plans may use their parts too. */
    extends?: string[];
    /** Size of the main plan as stated by the manufacturer (mm) */
    footprint?: {
        width: number;
        depth: number;
        /** The table space the maker says the layout needs, rounded up, not the box's exact size */
        space?: boolean;
    };
    plans: LayoutPlan[];
    /** Where the contents list comes from */
    referenceUrl?: string;
    /** Hobby-shop price in US cents: roughly the 2025 street price */
    price?: number;
}
