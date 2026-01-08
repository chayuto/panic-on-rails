/**
 * Switch Routing Utilities
 * 
 * Functions for determining train paths through switches.
 * Handles both "facing point" (entry to main/branch) and
 * "trailing point" (main/branch to entry) movements.
 */

import type { TrackNode, TrackEdge } from '../types';

type NodeId = string;
type EdgeId = string;

/**
 * Determine the exit edge when a train reaches a switch node.
 * 
 * @param node - The switch node being traversed
 * @param entryEdgeId - The edge the train is coming from
 * @returns The edge ID to exit through, or null if no valid exit
 */
export function getSwitchExitEdge(
    node: TrackNode,
    entryEdgeId: EdgeId
): EdgeId | null {
    if (node.type !== 'switch') {
        console.warn('[switchRouting] Node is not a switch:', node.id);
        return null;
    }

    const { switchState, switchBranches, connections } = node;

    if (!switchBranches || switchBranches.length !== 2) {
        console.warn('[switchRouting] Switch missing branch definitions:', node.id);
        // Fallback: return first other connection
        const other = connections.find(id => id !== entryEdgeId);
        return other ?? null;
    }

    const [mainEdgeId, branchEdgeId] = switchBranches;

    // Determine which connector we're entering from
    const isEnteringFromMain = entryEdgeId === mainEdgeId;
    const isEnteringFromBranch = entryEdgeId === branchEdgeId;

    if (isEnteringFromMain || isEnteringFromBranch) {
        // TRAILING POINT: Entering from main or branch
        // Always exit via entry (the edge that's not main or branch)
        const entryEdge = connections.find(
            id => id !== mainEdgeId && id !== branchEdgeId
        );
        return entryEdge ?? null;
    } else {
        // FACING POINT: Entering from entry connector
        // Use switch state to select exit
        if (switchState === 0) {
            // Main path - check if it's connected
            return connections.includes(mainEdgeId) ? mainEdgeId : branchEdgeId;
        } else {
            // Branch path - check if it's connected
            return connections.includes(branchEdgeId) ? branchEdgeId : mainEdgeId;
        }
    }
}

/**
 * Calculate the train direction on the new edge after traversing a switch.
 * 
 * @param newEdge - The edge the train is entering
 * @param exitNodeId - The node ID where the train exits the switch
 * @returns Direction: +1 if entering at startNode, -1 if entering at endNode
 */
export function getDirectionOnNewEdge(
    newEdge: TrackEdge,
    exitNodeId: NodeId
): 1 | -1 {
    // If we're at the start node of the new edge, we travel toward end (+1)
    // If we're at the end node, we travel toward start (-1)
    return newEdge.startNodeId === exitNodeId ? 1 : -1;
}

/**
 * Check if a switch allows passage in the current state.
 * 
 * Used for pathfinding and collision detection.
 * 
 * @param node - The switch node
 * @param fromEdgeId - Edge entering from
 * @param toEdgeId - Edge attempting to exit to
 * @returns true if passage is allowed
 */
export function isSwitchPassageAllowed(
    node: TrackNode,
    fromEdgeId: EdgeId,
    toEdgeId: EdgeId
): boolean {
    if (node.type !== 'switch' || !node.switchBranches) {
        return true;  // Non-switch nodes allow all passages
    }

    const [mainEdgeId, branchEdgeId] = node.switchBranches;
    const switchState = node.switchState ?? 0;

    // Determine entry type
    const isEnteringFromMain = fromEdgeId === mainEdgeId;
    const isEnteringFromBranch = fromEdgeId === branchEdgeId;

    if (isEnteringFromMain || isEnteringFromBranch) {
        // Trailing point: can only exit via entry edge
        return toEdgeId !== mainEdgeId && toEdgeId !== branchEdgeId;
    } else {
        // Facing point: can only exit via active path
        const allowedExit = switchState === 0 ? mainEdgeId : branchEdgeId;
        return toEdgeId === allowedExit;
    }
}
