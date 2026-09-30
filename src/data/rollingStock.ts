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
