export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type TemplateSystem = 'n-scale' | 'wooden';

/**
 * Metadata about a template for display in UI
 */
export interface TemplateMetadata {
    id: string;
    name: string;
    description: string;
    difficulty: TemplateDifficulty;
    system: TemplateSystem;
    thumbnailUrl?: string;
    estimatedCost: number;  // in cents
    partCount: number;
    trainCount: number;
}

/**
 * A part placement instruction in a template recipe.
 * The app uses addTrack() to create each part with correct catalog geometry.
 */
export interface TemplatePart {
    partId: string;
    position: { x: number; y: number };
    rotation: number;  // degrees
}

/**
 * Train placement in a template.
 * `partIndex` references the index in the parts array whose primary edge
 * the train should spawn on.
 */
export interface TemplateTrainPlacement {
    partIndex: number;
    color: string;
}

/**
 * Complete template file structure (v2 - recipe-based).
 *
 * Templates store a recipe of part placements, not pre-baked geometry.
 * The app's addTrack() pipeline generates correct geometry from catalog
 * definitions, so templates always stay in sync with the catalog.
 */
export interface TrackTemplate {
    version: number;
    template: TemplateMetadata;
    parts: TemplatePart[];
    trains: TemplateTrainPlacement[];
    /** Distance threshold for auto-connecting nearby endpoints (default: 3) */
    connectThreshold?: number;
}

/**
 * Template manifest listing available templates
 */
export interface TemplateManifest {
    version: number;
    templates: TemplateMetadata[];
}
