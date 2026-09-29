/**
 * Rolling stock: the trains a player can own and run.
 *
 * These are generic models (a diesel with coaches, a freight train...),
 * not specific products: every entry is flagged `generic`. Real train sets
 * with product numbers belong here once their details are verified.
 */

import { DRIVING } from '../simulation/driving';

export interface RollingStock {
    id: string;
    name: string;
    description: string;
    /** Not a specific real product */
    generic: true;
    /** Livery colour */
    color: string;
    /** Cars including the locomotive */
    cars: number;
    /** Fastest the model runs, mm/s: the throttle's top */
    topSpeed: number;
    /** Hobby-shop price, US cents, in line with typical N-scale train sets */
    price: number;
}

export const ROLLING_STOCK: RollingStock[] = [
    {
        id: 'diesel-passenger',
        name: 'Diesel passenger train',
        description: 'A diesel locomotive and two coaches: the train in a starter set.',
        generic: true,
        color: '#C0392B',
        cars: 3,
        topSpeed: 200,
        price: 9000,
    },
    {
        id: 'commuter',
        name: 'Commuter train',
        description: 'Four cars, quick off the mark: good for a busy double oval.',
        generic: true,
        color: '#2471A3',
        cars: 4,
        topSpeed: 220,
        price: 11000,
    },
    {
        id: 'freight',
        name: 'Freight train',
        description: 'A heavy diesel and four freight cars. Slow, long, and hard to hide in a short siding.',
        generic: true,
        color: '#7D5A3C',
        cars: 5,
        topSpeed: 160,
        price: 12000,
    },
    {
        id: 'express',
        name: 'Express train',
        description: 'Six cars and a top speed that will take a tight curve badly. Mind the derailments.',
        generic: true,
        color: '#1F7A4D',
        cars: 6,
        topSpeed: DRIVING.MAX_THROTTLE,
        price: 18000,
    },
];

const BY_ID = new Map(ROLLING_STOCK.map(s => [s.id, s]));

export function getRollingStock(id: string | undefined): RollingStock | undefined {
    return id ? BY_ID.get(id) : undefined;
}
