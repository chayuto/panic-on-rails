import { useCallback } from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';
import { useLogicStore } from '../../../stores/useLogicStore';
import { useHistoryStore } from '../../../stores/useHistoryStore';
import { useModeStore, useIsEditing } from '../../../stores/useModeStore';
import { useConnectMode } from '../../../hooks/useConnectMode';
import { useEffectsStore } from '../../../stores/useEffectsStore';
import { playSound } from '../../../utils/audioManager';
import { throwPoints } from '../../../utils/points';
import { raiseJoint } from '../../../utils/piers';

export function useNodeInteraction() {
    const wireSource = useEditorStore(s => s.wireSource);
    const clearWireSource = useEditorStore(s => s.clearWireSource);
    const addSignal = useLogicStore(s => s.addSignal);
    const addWire = useLogicStore(s => s.addWire);
    const editSubMode = useModeStore(s => s.editSubMode);
    const isEditing = useIsEditing();
    const { handleConnectModeNodeClick } = useConnectMode();
    const setHoveredSwitch = useEffectsStore(s => s.setHoveredSwitch);

    /** Handle a click on a switch node. Returns true if the switch was toggled. */
    const handleSwitchClick = useCallback((nodeId: string): boolean => {
        // Simulate mode: points are the player's main control. Locked while a train is on them
        if (!isEditing || editSubMode === 'select') return throwPoints(nodeId);
        if (editSubMode === 'signal') {
            useHistoryStore.getState().record();
            addSignal(nodeId);
            playSound('switch');
        } else if (editSubMode === 'wire') {
            if (wireSource) {
                useHistoryStore.getState().record();
                addWire(wireSource.type, wireSource.id, 'switch', nodeId, 'toggle');
                playSound('switch');
                clearWireSource();
            }
        }
        return false;
    }, [isEditing, editSubMode, wireSource, addSignal, addWire, clearWireSource]);

    /** A click on a joint; `lower` for the Pier tool's Shift-click. */
    const handleNodeClick = useCallback((nodeId: string, lower = false) => {
        if (!isEditing) return;

        if (editSubMode === 'pier') {
            if (raiseJoint(nodeId, lower ? -1 : 1)) playSound('switch');
        } else if (editSubMode === 'connect') {
            handleConnectModeNodeClick(nodeId);
        } else if (editSubMode === 'signal') {
            useHistoryStore.getState().record();
            addSignal(nodeId);
            playSound('switch');
        }
    }, [isEditing, editSubMode, handleConnectModeNodeClick, addSignal]);

    return {
        handleSwitchClick,
        handleNodeClick,
        setHoveredSwitch
    };
}
