import { useCallback } from 'react';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useEditorStore } from '../../../stores/useEditorStore';
import { useLogicStore } from '../../../stores/useLogicStore';
import { useModeStore, useIsEditing } from '../../../stores/useModeStore';
import { useConnectMode } from '../../../hooks/useConnectMode';
import { useEffectsStore } from '../../../stores/useEffectsStore';
import { playSound, playSwitchSound } from '../../../utils/audioManager';

export function useNodeInteraction() {
    const { toggleSwitch } = useTrackStore();
    const { wireSource, clearWireSource } = useEditorStore();
    const { addSignal, addWire } = useLogicStore();
    const { editSubMode } = useModeStore();
    const isEditing = useIsEditing();
    const { handleConnectModeNodeClick } = useConnectMode();
    const { triggerRipple, setHoveredSwitch } = useEffectsStore();

    const handleSwitchClick = useCallback((nodeId: string) => {
        if (!isEditing) return;

        if (editSubMode === 'select') {
            toggleSwitch(nodeId);
            playSwitchSound('n-scale');
        } else if (editSubMode === 'signal') {
            addSignal(nodeId);
            playSound('switch');
        } else if (editSubMode === 'wire') {
            if (wireSource) {
                addWire(wireSource.type, wireSource.id, 'switch', nodeId, 'toggle');
                playSound('switch');
                clearWireSource();
            }
        }
    }, [isEditing, editSubMode, wireSource, toggleSwitch, addSignal, addWire, clearWireSource]);

    const handleNodeClick = useCallback((nodeId: string) => {
        if (!isEditing) return;

        if (editSubMode === 'connect') {
            handleConnectModeNodeClick(nodeId);
        } else if (editSubMode === 'signal') {
            addSignal(nodeId);
            playSound('switch');
        }
    }, [isEditing, editSubMode, handleConnectModeNodeClick, addSignal]);

    return {
        handleSwitchClick,
        handleNodeClick,
        triggerRipple, // Exposed for SwitchRenderer
        setHoveredSwitch
    };
}
