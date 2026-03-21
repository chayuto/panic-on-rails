/**
 * Test Templates — Reusable track configurations for E2E testing.
 *
 * Each template defines a sequence of parts that can be built into
 * a connected layout using the circuit builder. Templates are grouped
 * by category and tagged with properties for easy lookup.
 *
 * Usage:
 *   import { TEMPLATES, getTemplate, getTemplatesByTag } from './test-templates';
 *
 *   // Build a specific template
 *   const template = getTemplate('n-scale-oval');
 *   await buildCircuit(stores, page, template.parts, template.startPos, template.startRotation);
 *
 *   // Find all circuit templates
 *   const circuits = getTemplatesByTag('circuit');
 */

export interface TestTemplate {
    /** Unique identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Short description */
    description: string;
    /** Track system */
    system: 'n-scale' | 'wooden' | 'mixed';
    /** Tags for filtering */
    tags: string[];
    /** Ordered part IDs to place */
    parts: string[];
    /** Starting position for first piece */
    startPos: { x: number; y: number };
    /** Starting rotation in degrees */
    startRotation: number;
    /** Expected piece count after placement */
    expectedEdges: number;
    /** Whether this forms a closed circuit (0 open endpoints) */
    isCircuit: boolean;
    /** Verified: train moves on this layout */
    trainVerified: boolean;
    /** Notes about the layout */
    notes?: string;
}

// =============================================
// N-SCALE CIRCLES
// =============================================

const nScaleCircleR216: TestTemplate = {
    id: 'n-circle-r216',
    name: 'Tight Circle R216',
    description: '8 tight curves forming smallest N-Scale circle',
    system: 'n-scale',
    tags: ['circuit', 'circle', 'curves-only', 'small'],
    parts: Array(8).fill('kato-20-170'),
    startPos: { x: 700, y: 300 },
    startRotation: 0,
    expectedEdges: 8,
    isCircuit: true,
    trainVerified: true,
    notes: 'R216mm, 45° per piece, tightest standard curve',
};

const nScaleCircleR249: TestTemplate = {
    id: 'n-circle-r249',
    name: 'Standard Circle R249',
    description: '8 standard curves forming the default circle',
    system: 'n-scale',
    tags: ['circuit', 'circle', 'curves-only', 'standard'],
    parts: Array(8).fill('kato-20-100'),
    startPos: { x: 700, y: 300 },
    startRotation: 0,
    expectedEdges: 8,
    isCircuit: true,
    trainVerified: true,
    notes: 'R249mm, same as Simple Oval template but built programmatically',
};

const nScaleCircleR315: TestTemplate = {
    id: 'n-circle-r315',
    name: 'Wide Circle R315',
    description: '8 wide curves forming a larger circle',
    system: 'n-scale',
    tags: ['circuit', 'circle', 'curves-only', 'wide'],
    parts: Array(8).fill('kato-20-120'),
    startPos: { x: 700, y: 200 },
    startRotation: 0,
    expectedEdges: 8,
    isCircuit: true,
    trainVerified: true,
    notes: 'R315mm outer curve, good for double-track layouts',
};

const nScaleCircleR348: TestTemplate = {
    id: 'n-circle-r348',
    name: 'Extra Wide Circle R348',
    description: '8 large curves forming an extra-wide circle',
    system: 'n-scale',
    tags: ['circuit', 'circle', 'curves-only', 'extra-wide'],
    parts: Array(8).fill('kato-20-132'),
    startPos: { x: 700, y: 200 },
    startRotation: 0,
    expectedEdges: 8,
    isCircuit: true,
    trainVerified: true,
    notes: 'R348mm, largest 45° curve',
};

const nScaleCircle12Segment: TestTemplate = {
    id: 'n-circle-12seg',
    name: '12-Segment Circle R381',
    description: '12 gentle curves (30° each) forming a smooth circle',
    system: 'n-scale',
    tags: ['circuit', 'circle', 'curves-only', 'gentle', 'large'],
    parts: Array(12).fill('kato-20-140'),
    startPos: { x: 700, y: 200 },
    startRotation: 0,
    expectedEdges: 12,
    isCircuit: true,
    trainVerified: true,
    notes: 'R381mm, 30° segments, smoother than 45° circles',
};

// =============================================
// N-SCALE OVALS
// =============================================

const nScaleOval: TestTemplate = {
    id: 'n-oval-standard',
    name: 'Standard Oval',
    description: '4+4 curves with 2 connecting straights',
    system: 'n-scale',
    tags: ['circuit', 'oval', 'curves-and-straights', 'standard'],
    parts: [
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-000',
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-000',
    ],
    startPos: { x: 500, y: 300 },
    startRotation: 0,
    expectedEdges: 10,
    isCircuit: true,
    trainVerified: true,
    notes: '10 pieces: 8 R249 curves + 2 × 248mm straights',
};

const nScaleLongOval: TestTemplate = {
    id: 'n-oval-long',
    name: 'Long Oval',
    description: '4+4 curves with 6 straights (3 per side)',
    system: 'n-scale',
    tags: ['circuit', 'oval', 'curves-and-straights', 'long'],
    parts: [
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-000', 'kato-20-000', 'kato-20-000',
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-000', 'kato-20-000', 'kato-20-000',
    ],
    startPos: { x: 400, y: 250 },
    startRotation: 0,
    expectedEdges: 14,
    isCircuit: true,
    trainVerified: true,
    notes: '14 pieces: 8 curves + 6 straights, ~1.2m total length',
};

const nScaleLargeOval: TestTemplate = {
    id: 'n-oval-large',
    name: 'Large Oval',
    description: '4+4 curves with 10 straights (5 per side)',
    system: 'n-scale',
    tags: ['circuit', 'oval', 'curves-and-straights', 'large'],
    parts: [
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000',
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000',
    ],
    startPos: { x: 200, y: 200 },
    startRotation: 0,
    expectedEdges: 18,
    isCircuit: true,
    trainVerified: true,
    notes: '18 pieces: 8 curves + 10 straights, largest tested oval',
};

const nScaleCompactOval: TestTemplate = {
    id: 'n-oval-compact',
    name: 'Compact Oval',
    description: '4+4 curves with 2 short straights',
    system: 'n-scale',
    tags: ['circuit', 'oval', 'curves-and-straights', 'compact'],
    parts: [
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-020',
        'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
        'kato-20-020',
    ],
    startPos: { x: 500, y: 250 },
    startRotation: 0,
    expectedEdges: 10,
    isCircuit: true,
    trainVerified: true,
    notes: '10 pieces: 8 curves + 2 × 124mm short straights',
};

// =============================================
// N-SCALE RECTANGLE
// =============================================

const nScaleRectangle: TestTemplate = {
    id: 'n-rectangle',
    name: 'Rectangle',
    description: '4 straights with 2 curves at each corner (90° turns)',
    system: 'n-scale',
    tags: ['circuit', 'rectangle', 'curves-and-straights'],
    parts: [
        'kato-20-000',
        'kato-20-100', 'kato-20-100',
        'kato-20-000',
        'kato-20-100', 'kato-20-100',
        'kato-20-000',
        'kato-20-100', 'kato-20-100',
        'kato-20-000',
        'kato-20-100', 'kato-20-100',
    ],
    startPos: { x: 350, y: 500 },
    startRotation: 0,
    expectedEdges: 12,
    isCircuit: true,
    trainVerified: true,
    notes: '12 pieces: 4 × 248mm straights + 8 × R249-45° curves, ~90° at each corner',
};

// =============================================
// WOODEN CIRCUITS
// =============================================

const woodenCircle: TestTemplate = {
    id: 'wooden-circle',
    name: 'Wooden Circle',
    description: '8 large wooden curves forming a circle',
    system: 'wooden',
    tags: ['circuit', 'circle', 'curves-only', 'wooden'],
    parts: Array(8).fill('wooden-curve-large'),
    startPos: { x: 600, y: 300 },
    startRotation: 0,
    expectedEdges: 8,
    isCircuit: true,
    trainVerified: true,
    notes: 'R182mm Brio large curves, wooden system',
};

const woodenOval: TestTemplate = {
    id: 'wooden-oval',
    name: 'Wooden Oval',
    description: '8 curves with 2 straight sections',
    system: 'wooden',
    tags: ['circuit', 'oval', 'curves-and-straights', 'wooden'],
    parts: [
        'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large',
        'wooden-straight-long',
        'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large',
        'wooden-straight-long',
    ],
    startPos: { x: 500, y: 250 },
    startRotation: 0,
    expectedEdges: 10,
    isCircuit: true,
    trainVerified: true,
    notes: '10 pieces: 8 Brio curves + 2 × 216mm straights',
};

// =============================================
// NON-CIRCUIT TEMPLATES (open endpoints)
// =============================================

const nScaleStraightRun: TestTemplate = {
    id: 'n-straight-run',
    name: 'Straight Run',
    description: '6 connected straights forming a long line',
    system: 'n-scale',
    tags: ['linear', 'straights-only', 'bounce-test'],
    parts: Array(6).fill('kato-20-000'),
    startPos: { x: 100, y: 400 },
    startRotation: 0,
    expectedEdges: 6,
    isCircuit: false,
    trainVerified: true,
    notes: '~1.5m total length, good for bounce and collision testing',
};

const nScaleMixedStraights: TestTemplate = {
    id: 'n-mixed-straights',
    name: 'Mixed Straights',
    description: 'Chain of different-length straights',
    system: 'n-scale',
    tags: ['linear', 'mixed-parts'],
    parts: ['kato-20-000', 'kato-20-010', 'kato-20-020', 'kato-20-030'],
    startPos: { x: 200, y: 400 },
    startRotation: 0,
    expectedEdges: 4,
    isCircuit: false,
    trainVerified: true,
    notes: '248+186+124+64mm = 622mm total, tests mixed-length connections',
};

const nScaleShortChain: TestTemplate = {
    id: 'n-short-chain',
    name: 'Short Pieces Chain',
    description: 'Chain of the smallest straight pieces',
    system: 'n-scale',
    tags: ['linear', 'small-parts'],
    parts: ['kato-20-091', 'kato-20-092', 'kato-20-030', 'kato-20-040'],
    startPos: { x: 300, y: 400 },
    startRotation: 0,
    expectedEdges: 4,
    isCircuit: false,
    trainVerified: true,
    notes: '29+45.5+64+62mm = 200.5mm total, smallest pieces',
};

const woodenStraightRun: TestTemplate = {
    id: 'wooden-straight-run',
    name: 'Wooden Straight Run',
    description: '4 long wooden straights connected',
    system: 'wooden',
    tags: ['linear', 'straights-only', 'wooden'],
    parts: Array(4).fill('wooden-straight-long'),
    startPos: { x: 200, y: 400 },
    startRotation: 0,
    expectedEdges: 4,
    isCircuit: false,
    trainVerified: true,
    notes: '4 × 216mm Brio straights = 864mm total',
};

const ikeaStraightRun: TestTemplate = {
    id: 'ikea-straight-run',
    name: 'IKEA Mixed Straights',
    description: '3 IKEA straights of different lengths',
    system: 'wooden',
    tags: ['linear', 'mixed-parts', 'ikea'],
    parts: ['ikea-straight-long', 'ikea-straight-medium', 'ikea-straight-short'],
    startPos: { x: 300, y: 400 },
    startRotation: 0,
    expectedEdges: 3,
    isCircuit: false,
    trainVerified: true,
    notes: '216+144+72mm = 432mm, IKEA wooden system',
};

// =============================================
// ALL TEMPLATES
// =============================================

export const TEMPLATES: TestTemplate[] = [
    // Circuits - Circles
    nScaleCircleR216,
    nScaleCircleR249,
    nScaleCircleR315,
    nScaleCircleR348,
    nScaleCircle12Segment,
    // Circuits - Ovals
    nScaleOval,
    nScaleLongOval,
    nScaleLargeOval,
    nScaleCompactOval,
    // Circuits - Rectangle
    nScaleRectangle,
    // Circuits - Wooden
    woodenCircle,
    woodenOval,
    // Linear
    nScaleStraightRun,
    nScaleMixedStraights,
    nScaleShortChain,
    woodenStraightRun,
    ikeaStraightRun,
];

// =============================================
// LOOKUP HELPERS
// =============================================

/** Get a template by ID */
export function getTemplate(id: string): TestTemplate | undefined {
    return TEMPLATES.find(t => t.id === id);
}

/** Get all templates matching a tag */
export function getTemplatesByTag(tag: string): TestTemplate[] {
    return TEMPLATES.filter(t => t.tags.includes(tag));
}

/** Get all circuit templates */
export function getCircuitTemplates(): TestTemplate[] {
    return TEMPLATES.filter(t => t.isCircuit);
}

/** Get all linear (non-circuit) templates */
export function getLinearTemplates(): TestTemplate[] {
    return TEMPLATES.filter(t => !t.isCircuit);
}

/** Get templates by system */
export function getTemplatesBySystem(system: 'n-scale' | 'wooden'): TestTemplate[] {
    return TEMPLATES.filter(t => t.system === system);
}

// =============================================
// SUMMARY (for documentation)
// =============================================

/**
 * Template Summary:
 *
 * CIRCUITS (12 templates, all verified):
 * ├── Circles (5):
 * │   ├── R216 Tight      — 8 pieces, smallest
 * │   ├── R249 Standard   — 8 pieces, default
 * │   ├── R315 Wide       — 8 pieces, outer track
 * │   ├── R348 Extra Wide — 8 pieces, largest 45°
 * │   └── R381 12-Segment — 12 pieces, smoothest
 * ├── Ovals (4):
 * │   ├── Standard        — 10 pieces (8 curves + 2 straights)
 * │   ├── Long            — 14 pieces (8 curves + 6 straights)
 * │   ├── Large           — 18 pieces (8 curves + 10 straights)
 * │   └── Compact         — 10 pieces (8 curves + 2 short straights)
 * ├── Rectangle (1):
 * │   └── Standard        — 12 pieces (4 straights + 8 curves)
 * └── Wooden (2):
 *     ├── Circle          — 8 Brio large curves
 *     └── Oval            — 10 pieces (8 curves + 2 straights)
 *
 * LINEAR (5 templates, all verified):
 * ├── N-Scale Straight Run    — 6 × 248mm
 * ├── N-Scale Mixed Straights — 248+186+124+64mm
 * ├── N-Scale Short Chain     — 29+45.5+64+62mm
 * ├── Wooden Straight Run     — 4 × 216mm Brio
 * └── IKEA Mixed Straights    — 216+144+72mm
 *
 * Total: 17 templates, 100% train-movement verified, 0 crashes
 */
