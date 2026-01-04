import { useMemo } from 'react';
import { Circle, Group, Line, Rect } from 'react-konva';
import { useSimulationStore, DEFAULT_CARRIAGE_SPACING } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useIsSimulating } from '../../stores/useModeStore';
import type { Train, TrackEdge, TrackNode, Vector2, EdgeId, NodeId } from '../../types';

const LOCOMOTIVE_RADIUS = 12;
const CARRIAGE_WIDTH = 20;
const CARRIAGE_HEIGHT = 10;
const BOUNCE_DURATION = 300; // ms

/**
 * Calculate world position from edge geometry and distance along edge
 */
function getPositionOnEdge(edge: TrackEdge, distance: number): Vector2 {
    const progress = Math.max(0, Math.min(1, distance / edge.length));

    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        return {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
        };
    } else {
        // Arc geometry
        const { center, radius, startAngle, endAngle } = edge.geometry;
        const angle = startAngle + (endAngle - startAngle) * progress;
        return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
        };
    }
}

/**
 * Calculate bounce animation scale using easeOutElastic
 */
function getBounceScale(bounceTime: number | undefined): { scaleX: number; scaleY: number } {
    if (!bounceTime) return { scaleX: 1, scaleY: 1 };

    const elapsed = performance.now() - bounceTime;
    if (elapsed > BOUNCE_DURATION) return { scaleX: 1, scaleY: 1 };

    // Normalize progress 0 to 1
    const t = elapsed / BOUNCE_DURATION;

    // EaseOutElastic for bouncy feel
    const c4 = (2 * Math.PI) / 3;
    const elasticValue = t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;

    // Squash: at t=0, scaleX=1.3, scaleY=0.7
    // Stretch back with elastic overshoot
    const squash = 0.3 * (1 - elasticValue);
    const scaleX = 1 + squash;
    const scaleY = 1 - squash;

    return { scaleX, scaleY };
}

/**
 * Calculate rotation angle (in degrees) based on edge geometry and position
 */
function getRotationOnEdge(edge: TrackEdge, distance: number, direction: 1 | -1): number {
    const progress = Math.max(0, Math.min(1, distance / edge.length));
    
    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        // Flip 180 degrees if moving backwards
        return (angle * 180 / Math.PI) + (direction === -1 ? 180 : 0);
    } else {
        // Arc geometry - tangent to the curve
        const { startAngle, endAngle } = edge.geometry;
        const angle = startAngle + (endAngle - startAngle) * progress;
        // Tangent is perpendicular to radius (add 90 degrees)
        const tangentAngle = angle + Math.PI / 2;
        // Flip if arc goes clockwise (endAngle < startAngle) or if moving backwards
        const arcDirection = endAngle > startAngle ? 1 : -1;
        return (tangentAngle * 180 / Math.PI) + (direction * arcDirection === -1 ? 180 : 0);
    }
}

/** Position info for a single carriage */
interface CarriagePosition {
    position: Vector2;
    rotation: number;  // degrees
    edgeId: EdgeId;
    distanceAlongEdge: number;
}

/**
 * Calculate positions for all carriages in a train by tracing back along the track.
 * The locomotive is at the front, carriages follow behind.
 */
function getCarriagePositions(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): CarriagePosition[] {
    const positions: CarriagePosition[] = [];
    const carriageCount = train.carriageCount ?? 1;
    const spacing = train.carriageSpacing ?? DEFAULT_CARRIAGE_SPACING;
    
    // Start with locomotive position
    let currentEdgeId = train.currentEdgeId;
    let currentDistance = train.distanceAlongEdge;
    let currentDirection = train.direction;
    
    for (let i = 0; i < carriageCount; i++) {
        const edge = edges[currentEdgeId];
        if (!edge) break;
        
        // Calculate position for this carriage
        const pos = getPositionOnEdge(edge, currentDistance);
        const rot = getRotationOnEdge(edge, currentDistance, currentDirection);
        
        positions.push({
            position: pos,
            rotation: rot,
            edgeId: currentEdgeId,
            distanceAlongEdge: currentDistance,
        });
        
        // For subsequent carriages, trace back along the track
        if (i < carriageCount - 1) {
            // Move backwards by spacing amount (opposite to train direction)
            let remainingDistance = spacing;
            
            while (remainingDistance > 0) {
                const edge = edges[currentEdgeId];
                if (!edge) break;
                
                // Calculate distance available on current edge in backward direction
                let availableDistance: number;
                if (currentDirection === 1) {
                    // Moving forward on edge, so backward = toward start
                    availableDistance = currentDistance;
                } else {
                    // Moving backward on edge, so backward = toward end
                    availableDistance = edge.length - currentDistance;
                }
                
                if (availableDistance >= remainingDistance) {
                    // Enough room on current edge
                    if (currentDirection === 1) {
                        currentDistance -= remainingDistance;
                    } else {
                        currentDistance += remainingDistance;
                    }
                    remainingDistance = 0;
                } else {
                    // Need to transition to previous edge
                    remainingDistance -= availableDistance;
                    
                    // Find the entry node (where we came from)
                    const entryNodeId = currentDirection === 1 ? edge.startNodeId : edge.endNodeId;
                    const entryNode = nodes[entryNodeId];
                    
                    if (!entryNode) break;
                    
                    // Find other connections (excluding current edge)
                    const otherConnections = entryNode.connections.filter(id => id !== currentEdgeId);
                    
                    if (otherConnections.length === 0) {
                        // Dead end - carriage stays at edge boundary
                        if (currentDirection === 1) {
                            currentDistance = 0;
                        } else {
                            currentDistance = edge.length;
                        }
                        break;
                    }
                    
                    // Take first available connection (simple path following)
                    const prevEdgeId = otherConnections[0];
                    const prevEdge = edges[prevEdgeId];
                    
                    if (!prevEdge) break;
                    
                    // Determine how we entered the previous edge
                    currentEdgeId = prevEdgeId;
                    if (prevEdge.endNodeId === entryNodeId) {
                        // We're at the end of the previous edge, going backward means direction = -1
                        currentDistance = prevEdge.length;
                        currentDirection = -1;
                    } else {
                        // We're at the start of the previous edge
                        currentDistance = 0;
                        currentDirection = 1;
                    }
                }
            }
        }
    }
    
    return positions;
}

/**
 * Individual train component with multi-carriage support
 */
function TrainEntity({ train }: { train: Train }) {
    const { edges, nodes } = useTrackStore();

    // Calculate positions for all carriages
    const carriagePositions = useMemo(() => {
        return getCarriagePositions(train, edges, nodes);
    }, [train, edges, nodes]);

    // Calculate bounce animation scale (only applies to locomotive)
    const { scaleX, scaleY } = getBounceScale(train.bounceTime);

    // Render nothing if no valid positions
    if (carriagePositions.length === 0) return null;

    // Crashed train rendering
    if (train.crashed) {
        const locoPos = carriagePositions[0];
        return (
            <Group>
                {/* Render all carriages as crashed */}
                {carriagePositions.map((carriage, index) => (
                    <Group key={index}>
                        {index === 0 ? (
                            // Crashed locomotive - dark gray circle with red stroke
                            <Circle
                                x={carriage.position.x}
                                y={carriage.position.y}
                                radius={LOCOMOTIVE_RADIUS}
                                fill="#444444"
                                stroke="#FF0000"
                                strokeWidth={3}
                                shadowColor="red"
                                shadowBlur={10}
                                shadowOpacity={0.5}
                            />
                        ) : (
                            // Crashed carriage - dark gray rectangle
                            <Rect
                                x={carriage.position.x - CARRIAGE_WIDTH / 2}
                                y={carriage.position.y - CARRIAGE_HEIGHT / 2}
                                width={CARRIAGE_WIDTH}
                                height={CARRIAGE_HEIGHT}
                                fill="#444444"
                                stroke="#FF0000"
                                strokeWidth={2}
                                cornerRadius={3}
                                rotation={carriage.rotation}
                                offsetX={0}
                                offsetY={0}
                            />
                        )}
                    </Group>
                ))}
                {/* X symbol on crashed locomotive */}
                <Line
                    points={[
                        locoPos.position.x - 6, locoPos.position.y - 6,
                        locoPos.position.x + 6, locoPos.position.y + 6,
                    ]}
                    stroke="#FF0000"
                    strokeWidth={3}
                    lineCap="round"
                />
                <Line
                    points={[
                        locoPos.position.x + 6, locoPos.position.y - 6,
                        locoPos.position.x - 6, locoPos.position.y + 6,
                    ]}
                    stroke="#FF0000"
                    strokeWidth={3}
                    lineCap="round"
                />
            </Group>
        );
    }

    // Normal train rendering with multiple carriages
    return (
        <Group>
            {carriagePositions.map((carriage, index) => {
                if (index === 0) {
                    // Locomotive (first car) - rendered as a circle
                    return (
                        <Circle
                            key={index}
                            x={carriage.position.x}
                            y={carriage.position.y}
                            radius={LOCOMOTIVE_RADIUS}
                            fill={train.color}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            shadowColor="black"
                            shadowBlur={5}
                            shadowOpacity={0.3}
                            scaleX={scaleX}
                            scaleY={scaleY}
                        />
                    );
                } else {
                    // Carriage - rendered as a rounded rectangle
                    // Use slightly lighter color for carriages
                    const carriageColor = lightenColor(train.color, 20);
                    return (
                        <Group key={index} x={carriage.position.x} y={carriage.position.y} rotation={carriage.rotation}>
                            <Rect
                                x={-CARRIAGE_WIDTH / 2}
                                y={-CARRIAGE_HEIGHT / 2}
                                width={CARRIAGE_WIDTH}
                                height={CARRIAGE_HEIGHT}
                                fill={carriageColor}
                                stroke="#FFFFFF"
                                strokeWidth={1.5}
                                cornerRadius={3}
                                shadowColor="black"
                                shadowBlur={3}
                                shadowOpacity={0.2}
                            />
                        </Group>
                    );
                }
            })}
        </Group>
    );
}

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
    // Remove # if present
    const h = hex.replace('#', '');
    
    // Parse RGB
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    
    // Lighten
    const newR = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Train layer - renders all active trains (simulate mode only)
 */
export function TrainLayer() {
    const { trains } = useSimulationStore();
    const isSimulating = useIsSimulating();

    // Safety check - don't render if not in simulate mode
    if (!isSimulating) {
        return null;
    }

    return (
        <Group>
            {Object.values(trains).map((train: Train) => (
                <TrainEntity key={train.id} train={train} />
            ))}
        </Group>
    );
}
