/**
 * Logic Component Types for PanicOnRails
 * 
 * Defines sensors, signals, and wires for the automation system.
 */

import type { EdgeId, NodeId, Vector2 } from './index';

// ===========================
// Logic Identifiers
// ===========================

export type SensorId = string;
export type SignalId = string;
export type WireId = string;

export type LogicState = 'off' | 'on';

// ===========================
// Sensors
// ===========================

/** A sensor zone that detects train presence on a track edge */
export interface Sensor {
    id: SensorId;
    edgeId: EdgeId;           // Which edge this sensor is on
    position: number;         // Distance along edge (0 to edge.length)
    length: number;           // Sensor zone length (default 30px)
    state: LogicState;        // 'on' when train present
}

// ===========================
// Signals
// ===========================

export type SignalState = 'red' | 'green';

/** A signal light that can stop trains or provide visual guidance */
export interface Signal {
    id: SignalId;
    nodeId: NodeId;           // Attached to which node
    state: SignalState;       // Current signal state
    offset: Vector2;          // Render offset from node position
}

// ===========================
// Wires
// ===========================

export type WireSourceType = 'sensor' | 'signal';
export type WireTargetType = 'switch' | 'signal';
export type WireAction =
    | 'set_main'      // Set switch to main path
    | 'set_branch'    // Set switch to branch path
    | 'toggle'        // Toggle switch or signal
    | 'set_red'       // Set signal to red
    | 'set_green';    // Set signal to green

/** A wire connecting logic components for automation */
export interface Wire {
    id: WireId;
    sourceType: WireSourceType;
    sourceId: SensorId | SignalId;
    targetType: WireTargetType;
    targetId: NodeId | SignalId;
    action: WireAction;
    // Trigger mode
    triggerOn: 'rising' | 'falling' | 'both';
}

// ===========================
// Logic Layout (for persistence)
// ===========================

export interface LogicLayoutData {
    sensors: Record<SensorId, Sensor>;
    signals: Record<SignalId, Signal>;
    wires: Record<WireId, Wire>;
}
