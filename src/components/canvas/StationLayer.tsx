/**
 * StationLayer: station platforms beside the track, with their names.
 *
 * A platform runs along its edge on the left of the edge's direction, its
 * near side clear of the cars, with a yellow safety line along it. With the
 * Station tool (or Delete), clicking a platform removes it.
 */

import { memo } from 'react';
import { Group, Line, Text } from 'react-konva';
import { useLogicStore } from '../../stores/useLogicStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useModeStore, useIsEditing } from '../../stores/useModeStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import { getPositionOnEdge, getRotationOnEdge } from '../../utils/trainGeometry';
import { getPartById } from '../../data/catalog';
import { sizeOf } from '../../config/scales';
import { STATIONS } from '../../config/stations';
import type { NodeId, Station, TrackEdge, TrackNode, Vector2 } from '../../types';

const PLATFORM_COLOR = '#8f8f8f';
const SAFETY_LINE_COLOR = '#E6C229';
/** Points along a platform, enough for a curved one to look curved */
const SAMPLES = 12;
/** Name label size on screen (px) */
const LABEL_PX = 11;

/** Points `offset` mm to the left of the track, along the platform's length. */
function alongside(edge: TrackEdge, station: Station, nodes: Record<NodeId, TrackNode>, offset: number): Vector2[] {
    const from = station.position - station.length / 2;
    return Array.from({ length: SAMPLES + 1 }, (_, i) => {
        const distance = from + (station.length * i) / SAMPLES;
        const p = getPositionOnEdge(edge, distance, nodes);
        const left = ((getRotationOnEdge(edge, distance, 1, nodes) - 90) * Math.PI) / 180;
        return { x: p.x + Math.cos(left) * offset, y: p.y + Math.sin(left) * offset };
    });
}

const flat = (points: Vector2[]) => points.flatMap(p => [p.x, p.y]);

const Platform = memo(function Platform({ station, edge, nodes, zoom, removable }: {
    station: Station;
    edge: TrackEdge;
    nodes: Record<NodeId, TrackNode>;
    zoom: number;
    removable: boolean;
}) {
    const size = sizeOf(getPartById(edge.partId)?.scale);
    const width = STATIONS.PLATFORM_WIDTH * size;
    const nearSide = STATIONS.PLATFORM_CLEARANCE * size;
    const body = alongside(edge, station, nodes, nearSide + width / 2);
    const edgeLine = alongside(edge, station, nodes, nearSide + 0.8 * size);
    const middle = alongside(edge, station, nodes, nearSide + width + (LABEL_PX * 0.8) / zoom)[SAMPLES / 2];

    const remove = () => {
        useHistoryStore.getState().record();
        useLogicStore.getState().removeStation(station.id);
    };

    return (
        <Group listening={removable} onClick={remove} onTap={remove}>
            <Line points={flat(body)} stroke={PLATFORM_COLOR} strokeWidth={width} lineCap="butt" lineJoin="round" />
            <Line points={flat(edgeLine)} stroke={SAFETY_LINE_COLOR} strokeWidth={1.2 * size} listening={false} />
            <Text
                x={middle.x}
                y={middle.y}
                text={station.name}
                fontSize={LABEL_PX / zoom}
                fill="#e8e8e8"
                align="center"
                width={200 / zoom}
                offsetX={100 / zoom}
                offsetY={(LABEL_PX / 2) / zoom}
                listening={false}
            />
        </Group>
    );
});

export function StationLayer() {
    const stations = useLogicStore(s => s.stations);
    const edges = useTrackStore(s => s.edges);
    const nodes = useTrackStore(s => s.nodes);
    const zoom = useEditorStore(s => s.zoom);
    const editSubMode = useModeStore(s => s.editSubMode);
    const isEditing = useIsEditing();
    const removable = isEditing && (editSubMode === 'station' || editSubMode === 'delete');

    return (
        <Group>
            {Object.values(stations).map(station => {
                const edge = edges[station.edgeId];
                return edge ? (
                    <Platform key={station.id} station={station} edge={edge} nodes={nodes} zoom={zoom} removable={removable} />
                ) : null;
            })}
        </Group>
    );
}
