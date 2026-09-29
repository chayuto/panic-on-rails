import type {
    TrackTemplate,
    TemplateMetadata,
    TemplateManifest
} from './types';
import type { TrackNode } from '../../types';
import { canJoin, isOpenEnd } from '../../utils/graphAnalysis';

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

/** Distance threshold for merging nearby endpoints */
/** Template positions are rounded, so endpoint gaps up to ~5px can occur from accumulated rounding. */
const CONNECT_THRESHOLD = 10;

/**
 * Apply a template by building it through the real addTrack() pipeline.
 *
 * Instead of loading pre-baked geometry, this places each part using the
 * catalog's track creation system, then auto-connects nearby endpoints.
 * This guarantees geometry always matches the catalog definitions.
 */
export function applyTemplate(
    template: TrackTemplate,
    clearLayout: () => void,
    addTrack: (partId: string, position: { x: number; y: number }, rotation: number) => string | null,
    getNodes: () => Record<string, TrackNode>,
    connectNodes: (survivorId: string, removedId: string) => void,
    spawnTrain: (edgeId: string, color?: string) => string,
    startSimulation: () => void,
    autoStart: boolean = true
): void {
    // Clear existing layout
    clearLayout();

    // Place each part through the real catalog pipeline
    const edgeIds: (string | null)[] = [];
    for (const part of template.parts) {
        const edgeId = addTrack(part.partId, part.position, part.rotation);
        edgeIds.push(edgeId);
        if (!edgeId) {
            console.warn(`[Templates] Failed to place part: ${part.partId}`);
        }
    }

    // Auto-connect nearby open endpoints
    const threshold = template.connectThreshold ?? CONNECT_THRESHOLD;
    autoConnectEndpoints(getNodes, connectNodes, threshold);

    // Spawn trains on the edges of the referenced parts
    for (const train of template.trains) {
        const edgeId = edgeIds[train.partIndex];
        if (edgeId) {
            spawnTrain(edgeId, train.color);
        }
    }

    // Auto-start simulation if requested
    if (autoStart && template.trains.length > 0) {
        setTimeout(() => {
            startSimulation();
        }, 100);
    }
}

/**
 * Join open ends that sit within threshold distance of each other.
 *
 * Open ends are plain ends and points with nothing beyond them (a
 * turnout's entry). The plain end is removed and the other node survives,
 * keeping its switch properties; if the removed node had the points, they
 * move to the survivor.
 */
function autoConnectEndpoints(
    getNodes: () => Record<string, TrackNode>,
    connectNodes: (survivorId: string, removedId: string) => void,
    threshold: number
): void {
    // Keep connecting until no more pairs found (iterative because merges change the graph)
    let merged = true;
    while (merged) {
        merged = false;
        const nodes = getNodes();
        const open = Object.values(nodes).filter(isOpenEnd);

        for (const ep of open) {
            for (const other of open) {
                if (!canJoin(ep, other)) continue;
                const dx = ep.position.x - other.position.x;
                const dy = ep.position.y - other.position.y;
                if (dx * dx + dy * dy < threshold * threshold) {
                    // A plain end is removed; points survive where they are
                    const [survivor, removed] = ep.type === 'switch' ? [ep, other] : [other, ep];
                    connectNodes(survivor.id, removed.id);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
    }
}

// Re-export types
export type {
    TrackTemplate,
    TemplateMetadata,
    TemplateDifficulty,
    TemplateSystem
} from './types';
