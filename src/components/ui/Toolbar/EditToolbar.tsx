/**
 * EditToolbar - Edit mode tool buttons
 * 
 * Displays the tool selection buttons when in Edit mode:
 * - Select (default editing)
 * - Delete
 * - Sensor
 * - Signal
 * - Wire
 */

import { useModeStore } from '../../../stores/useModeStore';
import { useTrackStore } from '../../../stores/useTrackStore';
import type { EditSubMode } from '../../../types/mode';

interface ToolButton {
    mode: EditSubMode;
    icon: string;
    label: string;
    title: string;
}

const EDIT_TOOLS: ToolButton[] = [
    {
        mode: 'select',
        icon: '✏️',
        label: 'Edit',
        title: 'Edit Mode - Select and move tracks'
    },
    {
        mode: 'connect',
        icon: '🔗',
        label: 'Connect',
        title: 'Connect Mode - Click two endpoints to connect tracks'
    },
    {
        mode: 'delete',
        icon: '🗑️',
        label: 'Delete',
        title: 'Delete Tool - Click tracks to remove them'
    },
    {
        mode: 'sensor',
        icon: '📡',
        label: 'Sensor',
        title: 'Sensor Tool - Place sensors on tracks'
    },
    {
        mode: 'signal',
        icon: '🚦',
        label: 'Signal',
        title: 'Signal Tool - Place signals at nodes'
    },
    {
        mode: 'wire',
        icon: '🔌',
        label: 'Wire',
        title: 'Wire Tool - Connect sensors to switches/signals'
    },
];

export function EditToolbar() {
    const { editSubMode, setEditSubMode } = useModeStore();
    const { nodes, edges } = useTrackStore();

    const handleDebugExport = () => {
        // Build debug info with connection analysis
        const nodeList = Object.values(nodes).map(node => ({
            id: node.id,
            position: node.position,
            rotation: node.rotation,
            type: node.type,
            connectionCount: node.connections.length,
            connections: node.connections,
            // Check if this is a properly connected joint (2+ connections)
            isJoint: node.connections.length >= 2,
            // Show which edges connect at this node
            connectedEdges: node.connections.map(edgeId => {
                const edge = edges[edgeId];
                if (!edge) return { edgeId, error: 'EDGE_NOT_FOUND' };
                return {
                    edgeId,
                    isStart: edge.startNodeId === node.id,
                    isEnd: edge.endNodeId === node.id,
                };
            }),
        }));

        const edgeList = Object.values(edges).map(edge => {
            // Calculate tangent directions at each end of the edge
            let tangentAtStart: number | null = null;
            let tangentAtEnd: number | null = null;
            let curveDirection: string | null = null;

            if (edge.geometry.type === 'straight') {
                // Straight track: tangent is the same at both ends
                const dx = edge.geometry.end.x - edge.geometry.start.x;
                const dy = edge.geometry.end.y - edge.geometry.start.y;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                tangentAtStart = Math.round(((angle % 360) + 360) % 360);
                tangentAtEnd = tangentAtStart;
                curveDirection = 'straight';
            } else if (edge.geometry.type === 'arc') {
                // Arc: tangent is perpendicular to radius at each point
                // Angles are now stored in DEGREES per constitution
                const { startAngle, endAngle } = edge.geometry;
                // Tangent = radius angle + 90°
                const startTangent = startAngle + 90;
                const endTangent = endAngle + 90;
                tangentAtStart = Math.round(((startTangent % 360) + 360) % 360);
                tangentAtEnd = Math.round(((endTangent % 360) + 360) % 360);
                // Determine if arc curves CW or CCW (in screen coords)
                const sweep = endAngle - startAngle;
                curveDirection = sweep > 0 ? 'CCW (left turn in math, curves down-right on screen)' :
                    'CW (right turn in math, curves up-left on screen)';
            }

            return {
                id: edge.id,
                partId: edge.partId,
                startNodeId: edge.startNodeId,
                endNodeId: edge.endNodeId,
                length: edge.length,
                geometry: edge.geometry,
                // Tangent analysis (helpful for debugging curve connections)
                tangentAtStart,
                tangentAtEnd,
                curveDirection,
                // Expected node rotations based on tangent
                expectedStartNodeRotation: tangentAtStart !== null ? (tangentAtStart + 180) % 360 : null,
                expectedEndNodeRotation: tangentAtEnd,
                // Verify node references are valid
                startNodeExists: !!nodes[edge.startNodeId],
                endNodeExists: !!nodes[edge.endNodeId],
            };
        });


        // Find potential issues
        const issues: string[] = [];

        // Check for orphan edges (edges pointing to non-existent nodes)
        edgeList.forEach(edge => {
            if (!edge.startNodeExists) {
                issues.push(`Edge ${edge.id.slice(0, 8)} has invalid startNodeId`);
            }
            if (!edge.endNodeExists) {
                issues.push(`Edge ${edge.id.slice(0, 8)} has invalid endNodeId`);
            }
        });

        // Check for nodes that should be connected but aren't
        nodeList.forEach(node => {
            if (node.connectionCount === 1) {
                // This is an endpoint - check if there's another endpoint very close
                const otherEndpoints = nodeList.filter(
                    n => n.id !== node.id && n.connectionCount === 1
                );
                otherEndpoints.forEach(other => {
                    const dist = Math.hypot(
                        other.position.x - node.position.x,
                        other.position.y - node.position.y
                    );
                    if (dist < 10) {
                        // Calculate angle compatibility for debugging
                        let rotDiff = Math.abs(other.rotation - node.rotation);
                        if (rotDiff > 180) rotDiff = 360 - rotDiff;
                        const facingError = Math.abs(rotDiff - 180);

                        // Determine why merge might have failed
                        const wouldSkipAngle = dist < 3;
                        const angleOk = wouldSkipAngle || facingError < 45;

                        issues.push(
                            `UNCONNECTED JOINT: Node ${node.id.slice(0, 8)} and ${other.id.slice(0, 8)} are ${dist.toFixed(1)}px apart but NOT connected! ` +
                            `[angles: ${node.rotation}° vs ${other.rotation}°, facingError=${facingError.toFixed(0)}°, ` +
                            `wouldMerge=${angleOk ? 'YES' : 'NO'} (skipAngle=${wouldSkipAngle}, angleCheck=${facingError < 45})]`
                        );
                    }
                });
            }
        });

        const debugData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalNodes: nodeList.length,
                totalEdges: edgeList.length,
                endpoints: nodeList.filter(n => n.connectionCount === 1).length,
                junctions: nodeList.filter(n => n.connectionCount >= 2).length,
                issueCount: issues.length,
            },
            mergeConfig: {
                mergeThreshold: 10,
                skipAngleCheckDistance: 3,
                angleTolerance: 45,
                note: "Nodes within mergeThreshold will merge if: dist < skipAngleCheckDistance OR facingError < angleTolerance"
            },
            issues,
            nodes: nodeList,
            edges: edgeList,
        };

        // Download as JSON
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `track-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // Also log to console
        console.log('[DEBUG EXPORT]', debugData);
        if (issues.length > 0) {
            console.warn('[DEBUG EXPORT] Issues found:', issues);
        }
    };

    // Debug export available via console: window.debugExport()
    if (typeof window !== 'undefined') {
        (window as unknown as { debugExport: () => void }).debugExport = handleDebugExport;
    }

    return (
        <>
            {EDIT_TOOLS.map(tool => (
                <button
                    key={tool.mode}
                    onClick={() => setEditSubMode(tool.mode)}
                    className={`toolbar-btn-icon ${editSubMode === tool.mode ? 'active' : ''}`}
                    title={tool.title}
                >
                    {tool.icon}
                </button>
            ))}
        </>
    );
}

