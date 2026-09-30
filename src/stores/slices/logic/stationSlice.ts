/**
 * Station Logic Slice: station stops on the track.
 */

import { v4 as uuidv4 } from 'uuid';
import type { LogicSliceCreator, StationSlice } from './types';
import { nextStationName } from '../../../simulation/stations';

export const createStationSlice: LogicSliceCreator<StationSlice> = (set, get) => ({
    /**
     * Add a station stop: a platform `length` mm long with its middle at
     * `position` along the edge (see `fitPlatform`). It's named "Station n".
     *
     * @returns ID of the new station
     */
    addStation: (edgeId, position, length) => {
        const id = uuidv4();
        set((state) => {
            state.stations[id] = { id, edgeId, position, length, name: nextStationName(state.stations) };
        });
        return id;
    },

    /** Remove a station stop. */
    removeStation: (stationId) => {
        set((state) => {
            delete state.stations[stationId];
        });
    },

    /** Stations with their platform on an edge. */
    getStationsOnEdge: (edgeId) => Object.values(get().stations).filter(s => s.edgeId === edgeId),
});
