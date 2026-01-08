/**
 * Track Creators - Barrel Export
 *
 * Exports all track creation functions for use by createTrackSlice.
 * Each creator is a pure function that returns nodes and edges without side effects.
 *
 * @module trackCreators
 */

export { createSwitchTrack, type SwitchTrackResult } from './switchTrack';
export { createCrossingTrack, type CrossingTrackResult } from './crossingTrack';
export { createStraightTrack, createCurveTrack, type StandardTrackResult } from './standardTrack';
