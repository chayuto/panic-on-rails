/**
 * Shared types for E2E test helpers.
 *
 * These mirror the app's store types but are kept minimal —
 * only the fields that tests actually need to read/assert on.
 */

export interface Vector2 {
    x: number;
    y: number;
}

export interface TrackNodeSnapshot {
    id: string;
    position: Vector2;
    rotation: number;
    connections: string[];
    type: string;
}

export interface TrackEdgeSnapshot {
    id: string;
    partId: string;
    startNodeId: string;
    endNodeId: string;
    length: number;
    geometry: {
        type: 'straight' | 'arc';
        [key: string]: unknown;
    };
}

export interface TrackStateSnapshot {
    nodes: Record<string, TrackNodeSnapshot>;
    edges: Record<string, TrackEdgeSnapshot>;
}

export interface ModeStateSnapshot {
    primaryMode: string;
    editSubMode: string;
    simulateSubMode: string;
}

export interface TrainSnapshot {
    id: string;
    currentEdgeId: string;
    distanceAlongEdge: number;
    direction: number;
    speed: number;
    crashed: boolean;
    color: string;
    [key: string]: unknown;
}

export interface SimulationStateSnapshot {
    trains: Record<string, TrainSnapshot>;
    isRunning: boolean;
    speedMultiplier: number;
    error: string | null;
    crashedParts: unknown[];
}

export interface EditorStateSnapshot {
    selectedEdgeId: string | null;
    selectedPartId: string;
    selectedSystem: string;
    showGrid: boolean;
    zoom: number;
    pan: Vector2;
    draggedPartId: string | null;
    ghostPosition: Vector2 | null;
}

export interface AllStoresSnapshot {
    track: TrackStateSnapshot;
    mode: ModeStateSnapshot;
    simulation: SimulationStateSnapshot;
    editor: EditorStateSnapshot;
    logic: {
        sensors: Record<string, unknown>;
        signals: Record<string, unknown>;
        wires: Record<string, unknown>;
    };
    budget: {
        balance: number;
        totalSpent: number;
    };
}

export interface ConsistencyReport {
    trackEdgeCount: { store: number; rendered: number; match: boolean };
    modeUiMatch: boolean;
    issues: string[];
}

export interface VerificationReport {
    screenshotPath: string;
    statePath: string;
    state: AllStoresSnapshot;
    consistency: ConsistencyReport;
}
