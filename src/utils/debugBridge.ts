/**
 * Debug Bridge for E2E Testing & Agentic Development
 *
 * Exposes Zustand stores to `window.__PANIC_STORES__` so Playwright
 * (or any external tool) can read state, mutate stores, and verify
 * the app programmatically.
 *
 * Activation:
 * - Always active during `pnpm dev` (import.meta.env.DEV)
 * - Active in preview/CI when `?e2e` URL parameter is present
 * - Active when `localStorage.panic-e2e === 'true'`
 *
 * The bridge is tree-shaken from production builds via the DEV guard
 * in App.tsx. The `?e2e` path is only used for preview builds in CI.
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useModeStore } from '../stores/useModeStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useEditorStore } from '../stores/useEditorStore';
import { useLogicStore } from '../stores/useLogicStore';
import { useEffectsStore } from '../stores/useEffectsStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import type Konva from 'konva';

// Extend Window interface for TypeScript
declare global {
    interface Window {
        __PANIC_STORES__?: PanicStoreBridge;
        __PANIC_STAGE__?: Konva.Stage | null;
    }
}

export interface PanicStoreBridge {
    track: {
        getState: () => {
            nodes: ReturnType<typeof useTrackStore.getState>['nodes'];
            edges: ReturnType<typeof useTrackStore.getState>['edges'];
        };
        addTrack: typeof useTrackStore.getState extends () => infer S
            ? S extends { addTrack: infer F } ? F : never
            : never;
        removeTrack: (edgeId: string) => void;
        loadLayout: (data: unknown) => void;
        clearLayout: () => void;
        getLayout: () => unknown;
        getOpenEndpoints: () => unknown[];
        connectNodes: (survivorId: string, removedId: string, edgeId: string) => void;
        connectNetworks: (anchorId: string, movingId: string, movingEdgeId: string, rotationDelta: number) => void;
        toggleSwitch: (nodeId: string) => void;
    };
    mode: {
        getState: () => {
            primaryMode: string;
            editSubMode: string;
            simulateSubMode: string;
        };
        enterEditMode: () => void;
        enterSimulateMode: () => void;
        setEditSubMode: (sub: string) => void;
        setSimulateSubMode: (sub: string) => void;
        togglePrimaryMode: () => void;
    };
    simulation: {
        getState: () => {
            trains: Record<string, unknown>;
            isRunning: boolean;
            speedMultiplier: number;
            error: string | null;
            crashedParts: unknown[];
            simLog: { seq: number; time: number; type: string; trainId: string; edgeId: string; detail: string }[];
            simElapsed: number;
        };
        spawnTrain: (edgeId: string, color?: string, carriageCount?: number) => string;
        removeTrain: (trainId: string) => void;
        setRunning: (running: boolean) => void;
        toggleRunning: () => void;
        clearTrains: () => void;
        setSpeedMultiplier: (multiplier: number) => void;
        clearLog: () => void;
    };
    editor: {
        getState: () => {
            selectedEdgeId: string | null;
            selectedPartId: string;
            selectedSystem: string;
            showGrid: boolean;
            zoom: number;
            pan: { x: number; y: number };
            draggedPartId: string | null;
            ghostPosition: { x: number; y: number } | null;
        };
        setSelectedPart: (partId: string) => void;
        setSelectedSystem: (system: 'n-scale' | 'wooden') => void;
        setSelectedEdge: (edgeId: string | null) => void;
        resetView: () => void;
        setZoom: (zoom: number) => void;
        setPan: (x: number, y: number) => void;
    };
    logic: {
        getState: () => {
            sensors: Record<string, unknown>;
            signals: Record<string, unknown>;
            wires: Record<string, unknown>;
        };
    };
    effects: {
        getState: () => {
            ripples: unknown[];
            flashes: unknown[];
            screenShake: unknown | null;
        };
        clearAllEffects: () => void;
    };
    budget: {
        getState: () => {
            balance: number;
            totalSpent: number;
            startingBudget: number;
        };
    };
}

function shouldActivate(): boolean {
    if (import.meta.env.DEV) return true;
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has('e2e')) return true;
    try {
        return localStorage.getItem('panic-e2e') === 'true';
    } catch {
        return false;
    }
}

export function initDebugBridge(): void {
    if (!shouldActivate()) return;

    const bridge: PanicStoreBridge = {
        track: {
            getState: () => {
                const s = useTrackStore.getState();
                return { nodes: s.nodes, edges: s.edges };
            },
            addTrack: (partId, position, rotation) =>
                useTrackStore.getState().addTrack(partId, position, rotation),
            removeTrack: (edgeId) =>
                useTrackStore.getState().removeTrack(edgeId),
            loadLayout: (data) =>
                useTrackStore.getState().loadLayout(data as Parameters<ReturnType<typeof useTrackStore.getState>['loadLayout']>[0]),
            clearLayout: () =>
                useTrackStore.getState().clearLayout(),
            getLayout: () =>
                useTrackStore.getState().getLayout(),
            getOpenEndpoints: () =>
                useTrackStore.getState().getOpenEndpoints(),
            connectNodes: (survivorId, removedId, edgeId) =>
                useTrackStore.getState().connectNodes(survivorId, removedId, edgeId),
            connectNetworks: (anchorId, movingId, movingEdgeId, rotationDelta) =>
                useTrackStore.getState().connectNetworks(anchorId, movingId, movingEdgeId, rotationDelta),
            toggleSwitch: (nodeId) =>
                useTrackStore.getState().toggleSwitch(nodeId),
        },
        mode: {
            getState: () => {
                const s = useModeStore.getState();
                return {
                    primaryMode: s.primaryMode,
                    editSubMode: s.editSubMode,
                    simulateSubMode: s.simulateSubMode,
                };
            },
            enterEditMode: () => useModeStore.getState().enterEditMode(),
            enterSimulateMode: () => useModeStore.getState().enterSimulateMode(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setEditSubMode: (sub) => useModeStore.getState().setEditSubMode(sub as any),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSimulateSubMode: (sub) => useModeStore.getState().setSimulateSubMode(sub as any),
            togglePrimaryMode: () => useModeStore.getState().togglePrimaryMode(),
        },
        simulation: {
            getState: () => {
                const s = useSimulationStore.getState();
                return {
                    trains: s.trains,
                    isRunning: s.isRunning,
                    speedMultiplier: s.speedMultiplier,
                    error: s.error,
                    crashedParts: s.crashedParts,
                    simLog: s.simLog,
                    simElapsed: s.simElapsed,
                };
            },
            spawnTrain: (edgeId, color?, carriageCount?) =>
                useSimulationStore.getState().spawnTrain(edgeId, color, carriageCount),
            removeTrain: (trainId) =>
                useSimulationStore.getState().removeTrain(trainId),
            setRunning: (running) =>
                useSimulationStore.getState().setRunning(running),
            toggleRunning: () =>
                useSimulationStore.getState().toggleRunning(),
            clearTrains: () =>
                useSimulationStore.getState().clearTrains(),
            setSpeedMultiplier: (multiplier) =>
                useSimulationStore.getState().setSpeedMultiplier(multiplier),
            clearLog: () =>
                useSimulationStore.getState().clearLog(),
        },
        editor: {
            getState: () => {
                const s = useEditorStore.getState();
                return {
                    selectedEdgeId: s.selectedEdgeId,
                    selectedPartId: s.selectedPartId,
                    selectedSystem: s.selectedSystem,
                    showGrid: s.showGrid,
                    zoom: s.zoom,
                    pan: s.pan,
                    draggedPartId: s.draggedPartId,
                    ghostPosition: s.ghostPosition,
                };
            },
            setSelectedPart: (partId) =>
                useEditorStore.getState().setSelectedPart(partId),
            setSelectedSystem: (system) =>
                useEditorStore.getState().setSelectedSystem(system),
            setSelectedEdge: (edgeId) =>
                useEditorStore.getState().setSelectedEdge(edgeId),
            resetView: () =>
                useEditorStore.getState().resetView(),
            setZoom: (zoom) =>
                useEditorStore.getState().setZoom(zoom),
            setPan: (x, y) =>
                useEditorStore.getState().setPan(x, y),
        },
        logic: {
            getState: () => {
                const s = useLogicStore.getState();
                return {
                    sensors: s.sensors,
                    signals: s.signals,
                    wires: s.wires,
                };
            },
        },
        effects: {
            getState: () => {
                const s = useEffectsStore.getState();
                return {
                    ripples: s.ripples,
                    flashes: s.flashes,
                    screenShake: s.screenShake,
                };
            },
            clearAllEffects: () =>
                useEffectsStore.getState().clearAllEffects(),
        },
        budget: {
            getState: () => {
                const s = useBudgetStore.getState();
                return {
                    balance: s.balance,
                    totalSpent: s.totalSpent,
                    startingBudget: s.startingBudget,
                };
            },
        },
    };

    window.__PANIC_STORES__ = bridge;
    console.log('[DebugBridge] Stores exposed to window.__PANIC_STORES__');
}

/**
 * Set the Konva Stage ref for visual consistency checking.
 * Called from StageWrapper on mount.
 */
export function setStageRef(stage: Konva.Stage | null): void {
    if (!shouldActivate()) return;
    window.__PANIC_STAGE__ = stage;
    if (stage) {
        console.log('[DebugBridge] Konva Stage exposed to window.__PANIC_STAGE__');
    }
}
