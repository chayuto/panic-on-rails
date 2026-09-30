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
 * Also exposes `window.__PANIC_SIM__` (see `src/simulation/harness.ts`):
 * pause the rAF loop, then `__PANIC_SIM__.seed(1); __PANIC_SIM__.runSeconds(5)`
 * steps the exact same simulation code deterministically, no clock mocking.
 *
 * And `window.__PANIC_QA__.look()` (see `qaLens.ts`): what is on the canvas
 * and where on the page, so tests and agents can play with real input.
 *
 * The bridge module ships in production bundles but stays inert unless one
 * of the activation conditions above holds.
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useModeStore } from '../stores/useModeStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useEditorStore } from '../stores/useEditorStore';
import { useLogicStore } from '../stores/useLogicStore';
import { useEffectsStore } from '../stores/useEffectsStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { removePiece } from './removePiece';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { simHarness, type SimHarness } from '../simulation/harness';
import { look, type QaLook } from './qaLens';
import type Konva from 'konva';
import { logger } from './logger';

// Extend Window interface for TypeScript
declare global {
    interface Window {
        __PANIC_STORES__?: PanicStoreBridge;
        __PANIC_STAGE__?: Konva.Stage | null;
        /** Headless simulation harness: step, seed, load recipes, summarize. */
        __PANIC_SIM__?: SimHarness;
        /** What's on the canvas, where, in page coordinates: see `utils/qaLens.ts`. */
        __PANIC_QA__?: { look: () => QaLook };
    }
}

/**
 * A store's chosen state and actions, typed by the store itself, so the
 * bridge can't drift from it. `getState()` and the actions read the store
 * when called, so they're never stale.
 */
function expose<S extends object, K extends keyof S, A extends keyof S>(
    store: { getState: () => S },
    state: readonly K[],
    actions: readonly A[]
): { getState: () => Pick<S, K> } & Pick<S, A> {
    const bound = Object.fromEntries(actions.map(name => [
        name,
        (...args: unknown[]) => (store.getState()[name] as (...a: unknown[]) => unknown)(...args),
    ])) as Pick<S, A>;
    return {
        getState: () => {
            const current = store.getState();
            return Object.fromEntries(state.map(key => [key, current[key]])) as Pick<S, K>;
        },
        ...bound,
    };
}

function createBridge() {
    return {
        track: {
            ...expose(useTrackStore, ['nodes', 'edges'], [
                'addTrack', 'removeTrack', 'loadLayout', 'clearLayout', 'getLayout', 'getOpenEndpoints', 'setNodeHeights',
                'connectNodes', 'connectNetworks', 'toggleSwitch',
            ]),
            /** Delete as the editor does: the piece, and the sensors, platforms and signals on it */
            removePiece,
        },
        mode: expose(useModeStore, ['primaryMode', 'editSubMode', 'simulateSubMode'], [
            'enterEditMode', 'enterSimulateMode', 'setEditSubMode', 'setSimulateSubMode', 'togglePrimaryMode',
        ]),
        simulation: expose(useSimulationStore, [
            'trains', 'isRunning', 'speedMultiplier', 'error', 'crashedParts', 'simLog', 'simElapsed',
            'wrecks', 'lastWreckAt', 'session', 'sessionResult',
        ], [
            'spawnTrain', 'removeTrain', 'rerailTrain', 'setCrashed', 'setTrainStopped', 'reverseTrain',
            'setTrainThrottle', 'setRunning', 'toggleRunning', 'clearTrains', 'setSpeedMultiplier', 'clearLog',
        ]),
        editor: expose(useEditorStore, [
            'selectedEdgeId', 'selectedPartId', 'selectedSystem', 'showGrid', 'showMeasurements', 'zoom', 'pan', 'draggedPartId', 'ghostPosition',
        ], ['setSelectedPart', 'setSelectedSystem', 'setSelectedEdge', 'resetView', 'setZoom', 'setPan']),
        logic: expose(useLogicStore, ['sensors', 'signals', 'wires', 'stations'], [
            'addSensor', 'removeSensor', 'addSignal', 'removeSignal', 'setSignalState', 'toggleSignal',
            'addWire', 'removeWire', 'addStation', 'removeStation', 'setStationInterval', 'clearLogic',
        ]),
        effects: expose(useEffectsStore, ['ripples', 'flashes', 'screenShake'], ['clearAllEffects']),
        onboarding: expose(useOnboardingStore, ['stage'], ['skipOnboarding', 'resetOnboarding']),
        collection: expose(useCollectionStore, ['mode', 'wallet', 'lifetimeEarned', 'ownedSets', 'looseParts', 'ownedTrains'], [
            'setMode', 'earn', 'buySet', 'buyPart', 'resetCollection',
        ]),
        history: {
            ...expose(useHistoryStore, [], ['record', 'undo', 'redo', 'clear']),
            getState: () => {
                const { past, future } = useHistoryStore.getState();
                return { canUndo: past.length > 0, canRedo: future.length > 0, pastCount: past.length, futureCount: future.length };
            },
        },
    };
}

/** What `window.__PANIC_STORES__` offers: each store's state and actions, typed from the store. */
export type PanicStoreBridge = ReturnType<typeof createBridge>;

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

    const bridge = createBridge();
    window.__PANIC_STORES__ = bridge;
    window.__PANIC_SIM__ = simHarness;
    window.__PANIC_QA__ = { look };
    logger.info('DebugBridge', 'Stores exposed to window.__PANIC_STORES__, sim harness to window.__PANIC_SIM__, the canvas to window.__PANIC_QA__.look()');
}

/**
 * Set the Konva Stage ref for visual consistency checking.
 * Called from StageWrapper on mount.
 */
export function setStageRef(stage: Konva.Stage | null): void {
    if (!shouldActivate()) return;
    window.__PANIC_STAGE__ = stage;
    if (stage) {
        logger.info('DebugBridge', 'Konva Stage exposed to window.__PANIC_STAGE__');
    }
}
