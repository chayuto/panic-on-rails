/**
 * useScreenShake — per-frame camera offset while a screen shake is active.
 *
 * Idle (no shake) it costs nothing: the rAF loop only runs while
 * `useEffectsStore.screenShake` is set, and the offset is {0, 0} otherwise.
 */

import { useEffect, useState } from 'react';
import { useEffectsStore, selectScreenShake } from '../stores/useEffectsStore';
import type { Vector2 } from '../types';

const NO_SHAKE: Vector2 = { x: 0, y: 0 };

export function useScreenShake(): Vector2 {
    const shake = useEffectsStore(selectScreenShake);
    const [offset, setOffset] = useState<Vector2>(NO_SHAKE);

    useEffect(() => {
        if (!shake) return;
        let frame = requestAnimationFrame(function tick() {
            setOffset(useEffectsStore.getState().getScreenShakeOffset());
            frame = requestAnimationFrame(tick);
        });
        return () => {
            cancelAnimationFrame(frame);
            setOffset(NO_SHAKE);
        };
    }, [shake]);

    return shake ? offset : NO_SHAKE;
}
