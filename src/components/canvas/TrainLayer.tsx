/**
 * TrainLayer - draws every train as model rolling stock.
 *
 * One Konva shape paints all trains straight from the simulation store:
 * each car is a pre-drawn sprite (see trains/carSprites) placed by its two
 * bogies (see utils/trainCars), so cars follow the route and cut across
 * curves. The shape redraws right after each simulation step, without a
 * React render per tick.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Shape } from 'react-konva';
import type Konva from 'konva';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useIsSimulating } from '../../stores/useModeStore';
import type { BoundingBox } from '../../types';
import { carCount, frameGeometry, getCarPoses } from '../../utils/trainCars';
import { ROLLING_STOCK } from '../../config/rollingStock';
import { sizeOf } from '../../config/scales';
import { carKindAt, tractionOf } from '../../data/rollingStock';
import { getCarSprite, SPRITE_MARGIN } from './trains/carSprites';

/** Cars this far outside the viewport (mm, N scale) still draw, to avoid pop-in. */
const CULL_MARGIN = 200;

export interface TrainLayerProps {
    viewport: BoundingBox | null;
}

function drawCrashMark(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 7);
    ctx.lineTo(x + 7, y + 7);
    ctx.moveTo(x + 7, y - 7);
    ctx.lineTo(x - 7, y + 7);
    ctx.stroke();
}

export function TrainLayer({ viewport }: TrainLayerProps) {
    const isSimulating = useIsSimulating();
    const shapeRef = useRef<Konva.Shape>(null);
    const viewportRef = useRef(viewport);

    // Culling reads the latest viewport at draw time
    useEffect(() => {
        viewportRef.current = viewport;
        shapeRef.current?.getLayer()?.batchDraw();
    }, [viewport]);

    // Redraw after each simulation step, in the same frame, without React
    useEffect(() => {
        let pending = false;
        const redraw = () => {
            pending = false;
            shapeRef.current?.getLayer()?.draw();
        };
        return useSimulationStore.subscribe((state, prev) => {
            if (state.trains === prev.trains || pending) return;
            pending = true;
            queueMicrotask(redraw);
        });
    }, []);

    const paint = useCallback((context: Konva.Context) => {
        const ctx = context._context;
        const { trains } = useSimulationStore.getState();
        const { edges, nodes } = useTrackStore.getState();
        const geometryOf = frameGeometry(edges, nodes);
        const view = viewportRef.current;
        for (const train of Object.values(trains)) {
            const poses = getCarPoses(train, edges, nodes, geometryOf);
            if (poses.length === 0) continue;
            // Sprites are drawn at N size; bigger scales stamp them bigger
            const size = sizeOf(train.scale);
            const W = ROLLING_STOCK.CAR_WIDTH * size;
            const m = SPRITE_MARGIN * size;
            const cull = CULL_MARGIN * size;
            if (view && !poses.some(p =>
                p.x > view.x - cull && p.x < view.x + view.width + cull &&
                p.y > view.y - cull && p.y < view.y + view.height + cull
            )) continue;

            // The locomotive leads, or pushes from the back after turning back
            const pushing = train.locoLeading === false;
            const count = carCount(train);
            // Each car's place in the train counting from the locomotive
            const fromLoco = (i: number) => (pushing ? count - 1 - i : i);
            const traction = tractionOf(train);
            // Draw from the back so the leading car sits on top at couplings
            for (let i = poses.length - 1; i >= 0; i--) {
                const pose = poses[i];
                const kind = carKindAt(train, fromLoco(i));
                const isLoco = kind === 'loco';
                const sprite = getCarSprite(kind, train.color, train.crashed === true, pose.length / size, traction);
                if (!sprite) continue;
                const L = pose.length;
                ctx.save();
                ctx.translate(pose.x, pose.y);
                // A pushing locomotive still faces the way it was going
                ctx.rotate(((pose.rotation + (isLoco && pushing ? 180 : 0)) * Math.PI) / 180);
                ctx.drawImage(sprite, -L / 2 - m, -W / 2 - m, L + 2 * m, W + 2 * m);
                ctx.restore();
            }
            const loco = poses[fromLoco(0)] ?? poses[0];
            if (train.crashed) drawCrashMark(ctx, loco.x, loco.y);
        }
    }, []);

    if (!isSimulating) return null;

    return <Shape ref={shapeRef} sceneFunc={paint} listening={false} perfectDrawEnabled={false} />;
}
