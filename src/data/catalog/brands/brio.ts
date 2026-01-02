/**
 * Brio / IKEA Lillabo Wooden Railway Parts
 * 
 * "Maximum Slop" system - loose tolerances for child-friendly assembly.
 * Snap tolerance: 10-15 degrees angle deviation allowed.
 * All measurements in millimeters.
 * 
 * ============================================
 * HOW TO ADD A NEW PART:
 * ============================================
 * 1. Measure the actual track piece
 * 2. Use the appropriate helper function
 * 3. Run `pnpm test` to validate
 */

import { straight, curve, switchPart } from '../helpers';
import type { PartDefinition } from '../types';

export const BRIO_PARTS: PartDefinition[] = [
    // ===========================
    // Straight Tracks
    // ===========================
    straight('wooden-straight-long', 'Long Straight', 216, 'brio', 'wooden'),
    straight('wooden-straight-short', 'Short Straight', 108, 'brio', 'wooden'),
    straight('wooden-straight-mini', 'Mini Straight', 54, 'brio', 'wooden'),

    // ===========================
    // Curved Tracks (8 pieces = full circle)
    // ===========================
    curve('wooden-curve-large', 'Large Curve', 182, 45, 'brio', 'wooden'),
    curve('wooden-curve-small', 'Small Curve', 90, 45, 'brio', 'wooden'),

    // ===========================
    // Switches
    // ===========================
    switchPart('wooden-switch-y', 'Y-Splitter', {
        mainLength: 108,
        branchLength: 108,
        branchAngle: 30,
        branchDirection: 'left',
    }, 'brio', 'wooden'),

    switchPart('wooden-switch-t', 'T-Junction', {
        mainLength: 108,
        branchLength: 108,
        branchAngle: 90,
        branchDirection: 'right',
    }, 'brio', 'wooden'),
];
