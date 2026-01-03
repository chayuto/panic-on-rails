import type {
    TrackTemplate,
    TemplateMetadata,
    TemplateManifest
} from './types';

// Base URL for template files (served from public folder via base path)
const getTemplateBaseUrl = (): string => {
    // In dev, Vite serves public at root; in prod, use import.meta.env.BASE_URL
    const base = import.meta.env.BASE_URL || '/';
    return `${base}templates`.replace(/\/+/g, '/');
};

/**
 * Fetch the list of available templates
 */
export async function getTemplateList(): Promise<TemplateMetadata[]> {
    try {
        const response = await fetch(`${getTemplateBaseUrl()}/manifest.json`);
        if (!response.ok) {
            console.warn('[Templates] Failed to load manifest:', response.status);
            return [];
        }
        const manifest: TemplateManifest = await response.json();
        return manifest.templates;
    } catch (error) {
        console.error('[Templates] Error loading manifest:', error);
        return [];
    }
}

/**
 * Load a specific template by ID
 */
export async function loadTemplate(templateId: string): Promise<TrackTemplate> {
    const response = await fetch(`${getTemplateBaseUrl()}/${templateId}.json`);
    if (!response.ok) {
        throw new Error(`Template not found: ${templateId}`);
    }
    return response.json();
}

/**
 * Apply a template to the stores
 * 
 * @param template - The template to apply
 * @param clearLayout - Function to clear the current layout
 * @param loadLayout - Function to load layout data
 * @param spawnTrain - Function to spawn a train on an edge
 * @param startSimulation - Function to start the simulation
 * @param autoStart - Whether to auto-start the simulation (default: true)
 */
export function applyTemplate(
    template: TrackTemplate,
    clearLayout: () => void,
    loadLayout: (data: unknown) => void,
    spawnTrain: (edgeId: string, color?: string) => string,
    startSimulation: () => void,
    autoStart: boolean = true
): void {
    // Clear existing layout
    clearLayout();

    // Load the template layout
    loadLayout(template.layout);

    // Spawn trains at specified positions
    // Note: Current spawnTrain doesn't support position/direction, 
    // train spawns at start of edge with direction 1
    for (const train of template.trains) {
        spawnTrain(train.edgeId, train.color);
    }

    // Auto-start simulation if requested
    if (autoStart && template.trains.length > 0) {
        // Small delay to let React re-render
        setTimeout(() => {
            startSimulation();
        }, 100);
    }
}

// Re-export types
export type {
    TrackTemplate,
    TemplateMetadata,
    TemplateDifficulty,
    TemplateSystem
} from './types';
