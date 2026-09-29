import { memo, useCallback } from 'react';
import { Shape } from 'react-konva';
import type Konva from 'konva';
import type { TrackGeometry } from '../../../types';
import { HIT_STROKE_WIDTH } from './constants';

interface EdgeHitTargetProps {
    edgeId: string;
    geometry: TrackGeometry;
    onClick: (edgeId: string, e: Konva.KonvaEventObject<Event>) => void;
}

/** Draws nothing: the track painter does the drawing. */
const drawNothing = () => {};

/**
 * An invisible, clickable band along one edge, so the editor can select or
 * delete it. Only rendered while editing.
 */
export const EdgeHitTarget = memo(function EdgeHitTarget({ edgeId, geometry, onClick }: EdgeHitTargetProps) {
    const hitFunc = useCallback((ctx: Konva.Context, shape: Konva.Shape) => {
        ctx.beginPath();
        if (geometry.type === 'straight') {
            ctx.moveTo(geometry.start.x, geometry.start.y);
            ctx.lineTo(geometry.end.x, geometry.end.y);
        } else {
            const a0 = (geometry.startAngle * Math.PI) / 180;
            const a1 = (geometry.endAngle * Math.PI) / 180;
            ctx.arc(geometry.center.x, geometry.center.y, geometry.radius, a0, a1, a1 < a0);
        }
        ctx.strokeShape(shape);
    }, [geometry]);

    const handleClick = useCallback((e: Konva.KonvaEventObject<Event>) => onClick(edgeId, e), [edgeId, onClick]);

    return (
        <Shape
            sceneFunc={drawNothing}
            hitFunc={hitFunc}
            stroke="#000"
            strokeWidth={HIT_STROKE_WIDTH}
            onClick={handleClick}
            onTap={handleClick}
            perfectDrawEnabled={false}
        />
    );
});
