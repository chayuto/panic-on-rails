/**
 * Track Creators
 *
 * Each creator is a pure function that returns nodes and edges without side
 * effects. `createPartTrack` is the single entry point: it dispatches to the
 * creator for the part's geometry.
 *
 * @module trackCreators
 */

export { createPartTrack } from './createPartTrack';
