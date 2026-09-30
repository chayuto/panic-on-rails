/**
 * Rolling stock: the trains a player can own and run.
 *
 * Two kinds:
 * - **Real trains**, from real train sets (`brand`, `referenceUrl`, and the
 *   boxes they come in, `comesIn`). A train that only comes in a box has no
 *   price of its own: you buy the box, track and all.
 * - **Generic models** (a diesel with coaches, a freight train...), flagged
 *   `generic`: the game's own archetypes, sold on their own.
 *
 * Top speeds are the game's, not the maker's: models don't publish one. They
 * go by the kind of train: shunters and tank engines slowest, then freight,
 * then passenger trains, which hold the starter ovals' curves flat out.
 */

import { DRIVING } from '../simulation/driving';
import { sizeOf } from '../config/scales';
import type { PartScale } from './catalog/types';
import type { Train } from '../types';

export type TrainBrand = 'kato' | 'marklin' | 'hornby';

export interface RollingStock {
    id: string;
    name: string;
    description: string;
    /** One of the game's own models, not a specific real product */
    generic?: true;
    /** The maker, for a real train */
    brand?: TrainBrand;
    /** Where its details come from: the maker's page, or a retailer's for what the maker leaves out */
    referenceUrl?: string;
    /** The boxed sets it comes in (set ids): the train in a train set */
    comesIn?: string[];
    /** The track it runs on */
    scale: PartScale;
    /** Livery colour */
    color: string;
    /** Cars including the locomotive */
    cars: number;
    /** Fastest the model runs, mm/s: the throttle's top */
    topSpeed: number;
    /** Hobby-shop price, US cents, when it's sold on its own; a train that only comes in a box has none */
    price?: number;
    /** A goods train: it passes through stations, carrying no passengers */
    freight?: true;
}

/** H0 trains are 160/87 the size of N ones and run that much faster; OO 160/76.2. */
const H0 = sizeOf('ho-scale');
const OO = sizeOf('oo-scale');

export const ROLLING_STOCK: RollingStock[] = [
    // Real trains, each in its train set: Kato USA's N starter sets (the M1
    // oval, a power pack and a train) and Hornby's OO train sets
    {
        id: 'kato-super-chief',
        name: 'Santa Fe Super Chief',
        description: 'An F7A in the red and silver warbonnet, with the 4-4-2 sleeper Regal Court, diner #601 and the observation car Vista Valley.',
        brand: 'kato',
        scale: 'n-scale',
        color: '#C0C4C8',
        cars: 4,
        topSpeed: 220,
        comesIn: ['kato-106-0018'],
        referenceUrl: 'https://www.trainz.com/products/kato-106-0018-n-santa-fe-starter-set',
    },
    {
        id: 'kato-up-gevo-freight',
        name: 'Union Pacific ES44AC mixed freight',
        description: 'A GE ES44AC "Gevo" in Union Pacific yellow with six freight cars: two tank cars, two hoppers and two gondolas.',
        brand: 'kato',
        scale: 'n-scale',
        color: '#F5B120',
        cars: 7,
        topSpeed: 160,
        freight: true,
        comesIn: ['kato-106-0023'],
        referenceUrl: 'https://www.trainz.com/products/kato-106-0023-n-es44ac-freight-train-set-up',
    },
    {
        id: 'kato-amtrak-viewliner',
        name: 'Amtrak ALC-42 and Viewliner II',
        description: 'A Siemens ALC-42 Charger in Amtrak\'s Phase VII paint with four Viewliner II cars: two sleepers, a diner and a baggage-dorm.',
        brand: 'kato',
        scale: 'n-scale',
        color: '#1F2B4D',
        cars: 5,
        topSpeed: 220,
        comesIn: ['kato-106-0047'],
        referenceUrl: 'https://tonystrains.com/product/kato-106-0047-n-scale-amtrak-starter-set-includes-siemens-alc-42-locomotive-in-phase-vii-paint-4-viewliner-ii-cars-unitrack-oval-power-pack',
    },
    {
        id: 'hornby-smokey-joe',
        name: 'Smokey Joe',
        description: 'Hornby\'s 0-4-0 saddle tank "Smokey Joe" in BR black, with a coach and a wagon.',
        brand: 'hornby',
        scale: 'oo-scale',
        color: '#333333',
        cars: 3,
        topSpeed: Math.round(150 * OO),
        comesIn: ['hornby-R1296M'],
        referenceUrl: 'https://uk.hornby.com/products/smokey-joe-train-set-r1296m',
    },
    {
        id: 'hornby-valley-drifter',
        name: 'Valley Drifter',
        description: 'A little 0-4-0 tank engine in crimson, with a coach and a wagon.',
        brand: 'hornby',
        scale: 'oo-scale',
        color: '#B2182B',
        cars: 3,
        topSpeed: Math.round(150 * OO),
        comesIn: ['hornby-R1270M'],
        referenceUrl: 'https://uk.hornby.com/products/valley-drifter-train-set-r1270m',
    },
    // The game's own generic models, sold on their own
    {
        id: 'diesel-passenger',
        name: 'Diesel passenger train',
        description: 'A diesel locomotive and two coaches: the train in a starter set.',
        generic: true,
        scale: 'n-scale',
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
        scale: 'n-scale',
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
        scale: 'n-scale',
        color: '#7D5A3C',
        cars: 5,
        topSpeed: 160,
        price: 12000,
        freight: true,
    },
    {
        id: 'express',
        name: 'Express train',
        description: 'Six cars and a top speed that will take a tight curve badly. Mind the derailments.',
        generic: true,
        scale: 'n-scale',
        color: '#1F7A4D',
        cars: 6,
        topSpeed: DRIVING.MAX_THROTTLE,
        price: 18000,
    },
    {
        id: 'h0-goods',
        name: 'H0 goods train',
        description: 'A diesel shunter and three wagons: the kind of train an H0 start set comes with.',
        generic: true,
        scale: 'ho-scale',
        color: '#B03A2E',
        cars: 4,
        topSpeed: Math.round(160 * H0),
        price: 22000,
        freight: true,
    },
    {
        id: 'h0-passenger',
        name: 'H0 passenger train',
        description: 'An electric locomotive and three coaches for a C-track layout.',
        generic: true,
        scale: 'ho-scale',
        color: '#1B4F72',
        cars: 4,
        topSpeed: Math.round(260 * H0),
        price: 32000,
    },
    {
        id: 'oo-tank-passenger',
        name: 'OO tank engine and coaches',
        description: 'A small tank engine and two coaches: the kind of train a Setrack train set comes with.',
        generic: true,
        scale: 'oo-scale',
        color: '#2E5E3E',
        cars: 3,
        topSpeed: Math.round(150 * OO),
        price: 18000,
    },
    {
        id: 'oo-express',
        name: 'OO express',
        description: 'A tender locomotive and three coaches. Quick on the straights; the 1st radius curves will test it.',
        generic: true,
        scale: 'oo-scale',
        color: '#6B1D28',
        cars: 4,
        topSpeed: Math.round(260 * OO),
        price: 26000,
    },
];

const BY_ID = new Map(ROLLING_STOCK.map(s => [s.id, s]));

export function getRollingStock(id: string | undefined): RollingStock | undefined {
    return id ? BY_ID.get(id) : undefined;
}

/** Passenger trains call at stations; freight trains pass through. A free-build train carries passengers. */
export function carriesPassengers(train: Pick<Train, 'stockId'>): boolean {
    return !getRollingStock(train.stockId)?.freight;
}

/** Fastest a train will go: its model's top speed, or a full throttle for its scale. */
export function topSpeedOf(train: Pick<Train, 'stockId' | 'scale'>): number {
    return getRollingStock(train.stockId)?.topSpeed ?? DRIVING.MAX_THROTTLE * sizeOf(train.scale);
}
