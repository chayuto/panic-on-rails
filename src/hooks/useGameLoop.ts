/**
 * Game loop hook — requestAnimationFrame driver for the simulation.
 *
 * All simulation logic lives in `src/simulation/` (`stepSimulation` is the
 * pure core, `tickSimulation` binds it to the stores). This hook only owns
 * the rAF lifecycle, delta-time capping, error recovery, and the mapping from
 * simulation events to audio/visual effects.
 */

import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useIsSimulating } from '../stores/useModeStore';
import { useEffectsStore } from '../stores/useEffectsStore';
import { playNearMissSound, playSound, playSwitchSound } from '../utils/audioManager';
import { tickSimulation, type SimEventSink } from '../simulation/tick';
import { getPositionOnEdge } from '../utils/trainGeometry'; // Re-export for compatibility
import { TIMING } from '../config/timing';

/** Maps simulation events to sound and screen effects in the browser. */
export const browserEffectsSink: SimEventSink = (event) => {
    switch (event.type) {
        case 'bounce':
            playSound('bounce');
            break;
        case 'collision': {
            const { triggerScreenShake, triggerFlash, triggerSlowMotion } = useEffectsStore.getState();
            triggerScreenShake(8 + event.severity * 4, 200 + event.severity * 100);
            triggerFlash(event.location, { color: '#FFFFFF', duration: 100 });
            triggerSlowMotion(TIMING.CRASH_SLOW_MOTION_MS);
            playSound('crash');
            break;
        }
        case 'derail': {
            const { triggerScreenShake, triggerFlash, triggerSlowMotion } = useEffectsStore.getState();
            triggerScreenShake(10, 300);
            triggerFlash(event.location, { color: '#FFB347', duration: 120 });
            triggerSlowMotion(TIMING.CRASH_SLOW_MOTION_MS);
            playSound('crash');
            break;
        }
        case 'near-miss':
            useEffectsStore.getState().triggerFlash(event.location, { color: '#FFD93D', duration: 120, radius: 18 });
            playNearMissSound();
            break;
        case 'switch':
            playSwitchSound('n-scale');
            break;
    }
};

export function useGameLoop() {
    const lastTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>(0);

    const isSimulating = useIsSimulating();
    const isRunning = useSimulationStore(s => s.isRunning);

    useEffect(() => {
        if (!isSimulating || !isRunning) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            lastTimeRef.current = 0;
            return;
        }

        const loop = (timestamp: number) => {
            if (!lastTimeRef.current) {
                lastTimeRef.current = timestamp;
            }

            const deltaTime = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            try {
                // Just after a crash, the railway runs in slow motion for a moment
                const slow = timestamp < useEffectsStore.getState().slowMotionUntil ? TIMING.CRASH_SLOW_MOTION_SCALE : 1;
                tickSimulation(Math.min(deltaTime, TIMING.DELTA_TIME_CAP) * slow, {
                    sink: browserEffectsSink,
                    ctx: { now: timestamp },
                });
            } catch (err) {
                console.error('Simulation Loop Error:', err);
                // setError also pauses the simulation
                useSimulationStore.getState().setError(
                    err instanceof Error ? err.message : 'Unknown simulation error'
                );
                return; // Stop the loop
            }

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isSimulating, isRunning]);

    return { getPositionOnEdge };
}
