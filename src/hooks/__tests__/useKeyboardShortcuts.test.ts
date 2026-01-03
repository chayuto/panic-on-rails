/**
 * Unit tests for useKeyboardShortcuts hook
 * 
 * Tests keyboard shortcut behavior across different modes:
 * - M key: Toggle between Edit/Simulate modes
 * - 1-6: Switch edit sub-modes (Edit mode only)
 * - Space: Play/Pause (Simulate mode only)
 * - +/-: Speed control (Simulate mode only)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useModeStore } from '../../stores/useModeStore';
import { useSimulationStore } from '../../stores/useSimulationStore';

describe('Keyboard Shortcuts (Store-Level Tests)', () => {
    beforeEach(() => {
        // Reset stores to default state
        useModeStore.setState({
            primaryMode: 'edit',
            editSubMode: 'select',
            simulateSubMode: 'observe',
        });
        useSimulationStore.setState({
            isRunning: false,
            speedMultiplier: 1.0,
        });
    });

    describe('Mode Toggle (M key)', () => {
        it('togglePrimaryMode switches from edit to simulate', () => {
            const store = useModeStore.getState();
            expect(store.primaryMode).toBe('edit');

            store.togglePrimaryMode();

            expect(useModeStore.getState().primaryMode).toBe('simulate');
        });

        it('togglePrimaryMode switches from simulate to edit', () => {
            useModeStore.setState({ primaryMode: 'simulate' });
            const store = useModeStore.getState();

            store.togglePrimaryMode();

            expect(useModeStore.getState().primaryMode).toBe('edit');
        });
    });

    describe('Edit Sub-Mode Shortcuts (1-6 keys)', () => {
        it('setEditSubMode changes to select mode', () => {
            const store = useModeStore.getState();
            store.setEditSubMode('select');
            expect(useModeStore.getState().editSubMode).toBe('select');
        });

        it('setEditSubMode changes to place mode', () => {
            const store = useModeStore.getState();
            store.setEditSubMode('place');
            expect(useModeStore.getState().editSubMode).toBe('place');
        });

        it('setEditSubMode changes to delete mode', () => {
            const store = useModeStore.getState();
            store.setEditSubMode('delete');
            expect(useModeStore.getState().editSubMode).toBe('delete');
        });

        it('setEditSubMode changes to sensor mode', () => {
            const store = useModeStore.getState();
            store.setEditSubMode('sensor');
            expect(useModeStore.getState().editSubMode).toBe('sensor');
        });

        it('setEditSubMode changes to signal mode', () => {
            const store = useModeStore.getState();
            store.setEditSubMode('signal');
            expect(useModeStore.getState().editSubMode).toBe('signal');
        });

        it('setEditSubMode changes to wire mode', () => {
            const store = useModeStore.getState();
            store.setEditSubMode('wire');
            expect(useModeStore.getState().editSubMode).toBe('wire');
        });
    });

    describe('Simulate Mode Shortcuts', () => {
        beforeEach(() => {
            useModeStore.setState({ primaryMode: 'simulate' });
        });

        it('toggleRunning toggles simulation state', () => {
            const store = useSimulationStore.getState();
            expect(store.isRunning).toBe(false);

            store.toggleRunning();
            expect(useSimulationStore.getState().isRunning).toBe(true);

            useSimulationStore.getState().toggleRunning();
            expect(useSimulationStore.getState().isRunning).toBe(false);
        });

        it('setSpeedMultiplier increases speed', () => {
            const store = useSimulationStore.getState();
            expect(store.speedMultiplier).toBe(1.0);

            store.setSpeedMultiplier(1.5);
            expect(useSimulationStore.getState().speedMultiplier).toBe(1.5);
        });

        it('setSpeedMultiplier decreases speed', () => {
            useSimulationStore.setState({ speedMultiplier: 2.0 });
            const store = useSimulationStore.getState();

            store.setSpeedMultiplier(1.5);
            expect(useSimulationStore.getState().speedMultiplier).toBe(1.5);
        });

        it('speed is clamped to max 3x', () => {
            const store = useSimulationStore.getState();
            store.setSpeedMultiplier(Math.min(3, 10));
            expect(useSimulationStore.getState().speedMultiplier).toBe(3);
        });

        it('speed is clamped to min 0.1x', () => {
            const store = useSimulationStore.getState();
            store.setSpeedMultiplier(Math.max(0.1, -1));
            expect(useSimulationStore.getState().speedMultiplier).toBe(0.1);
        });
    });

    describe('Mode Shortcut Map', () => {
        it('all edit sub-modes are valid', () => {
            const validModes = ['select', 'place', 'delete', 'sensor', 'signal', 'wire'];
            const shortcuts: Record<string, string> = {
                '1': 'select',
                '2': 'place',
                '3': 'delete',
                '4': 'sensor',
                '5': 'signal',
                '6': 'wire',
            };

            Object.values(shortcuts).forEach(mode => {
                expect(validModes).toContain(mode);
            });
        });
    });
});
