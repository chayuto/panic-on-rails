import type { LayoutData } from '../../types';

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
 * Train placement configuration for template
 */
export interface TemplateTrainPlacement {
    edgeId: string;        // Must match an edge in the layout
    position: number;      // Distance along edge (pixels)
    direction: 1 | -1;     // Movement direction
    color: string;         // Train color (hex)
}

/**
 * Complete template file structure
 */
export interface TrackTemplate {
    version: number;
    template: TemplateMetadata;
    layout: LayoutData;
    trains: TemplateTrainPlacement[];
}

/**
 * Template manifest listing available templates
 */
export interface TemplateManifest {
    version: number;
    templates: TemplateMetadata[];
}
