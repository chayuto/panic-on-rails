/**
 * Kato Unitrack N-Scale Track Library
 * 
 * Official Kato geometry specifications.
 * Track spacing: 33mm
 * All measurements in millimeters.
 * 
 * Reference: https://www.katousa.com/
 * 
 * ============================================
 * HOW TO ADD A NEW PART:
 * ============================================
 * 1. Find the Kato product code (e.g., 20-000)
 * 2. Look up the geometry in the Kato catalog
 * 3. Use the appropriate helper function below
 * 4. Run `pnpm test` to validate
 */

import { straight, curve, switchPart } from '../helpers';
import type { PartDefinition } from '../types';

export const KATO_PARTS: PartDefinition[] = [
    // ===========================
    // Straight Tracks
    // ===========================
    straight('kato-20-000', 'Straight 248mm', 248, 'kato', 'n-scale'),
    straight('kato-20-010', 'Straight 186mm', 186, 'kato', 'n-scale'),
    straight('kato-20-020', 'Straight 124mm', 124, 'kato', 'n-scale'),
    straight('kato-20-030', 'Straight 64mm', 64, 'kato', 'n-scale'),
    straight('kato-20-040', 'Feeder/Spacer 62mm', 62, 'kato', 'n-scale'),
    straight('kato-20-091', 'Short Straight 29mm', 29, 'kato', 'n-scale'),

    // ===========================
    // Curved Tracks (45° arcs)
    // ===========================
    curve('kato-20-170', 'Curve R216-45° (Tight)', 216, 45, 'kato', 'n-scale'),
    curve('kato-20-100', 'Curve R249-45°', 249, 45, 'kato', 'n-scale'),
    curve('kato-20-110', 'Curve R282-45° (Inner)', 282, 45, 'kato', 'n-scale'),
    curve('kato-20-120', 'Curve R315-45° (Outer)', 315, 45, 'kato', 'n-scale'),
    curve('kato-20-132', 'Curve R348-45°', 348, 45, 'kato', 'n-scale'),
    curve('kato-20-140', 'Curve R381-30°', 381, 30, 'kato', 'n-scale'),

    // ===========================
    // Large Radius (Shinkansen)
    // ===========================
    curve('kato-20-150', 'Curve R718-15° (Large)', 718, 15, 'kato', 'n-scale'),

    // ===========================
    // Switches / Turnouts
    // ===========================
    switchPart('kato-20-202', '#4 Turnout Left', {
        mainLength: 248,
        branchLength: 186,
        branchAngle: 15,
        branchDirection: 'left',
    }, 'kato', 'n-scale'),

    switchPart('kato-20-203', '#4 Turnout Right', {
        mainLength: 248,
        branchLength: 186,
        branchAngle: 15,
        branchDirection: 'right',
    }, 'kato', 'n-scale'),

    switchPart('kato-20-220', '#6 Turnout Left', {
        mainLength: 310,
        branchLength: 248,
        branchAngle: 10,
        branchDirection: 'left',
    }, 'kato', 'n-scale'),

    switchPart('kato-20-221', '#6 Turnout Right', {
        mainLength: 310,
        branchLength: 248,
        branchAngle: 10,
        branchDirection: 'right',
    }, 'kato', 'n-scale'),
];
