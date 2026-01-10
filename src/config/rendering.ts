/**
 * Visualization constants for Canvas rendering
 */

export const RENDERING = {
    // Train Dimensions
    LOCOMOTIVE: {
        WIDTH: 28,
        HEIGHT: 16,
        NOSE: 6,
    },
    CARRIAGE: {
        WIDTH: 22,
        HEIGHT: 12,
        CORNER_RADIUS: 4,
    },

    // Train Effects
    HEADLIGHT: {
        RADIUS: 3,
        COLOR: '#FFFFCC',
    },
    CONE: {
        LENGTH: 70,
        ANGLE: 35,
        OPACITY: 0.15,
        COLOR: '#FFFFCC',
    },
    TRAIL: {
        SEGMENT_COUNT: 6,
        SEGMENT_SPACING: 12,
        MIN_SPEED: 50,
        BASE_OPACITY: 0.4,
        SEGMENT_RADIUS: 4,
    },

    // Colors
    COLORS: {
        CRASH_FILL: '#444444',
        CRASH_STROKE: '#FF0000',
        CRASH_SHADOW: 'red',
        DEFAULT_SHADOW: 'black',
    }
} as const;
