/**
 * Unit Tests for useModeStore
 * 
 * Tests the mode store's state management, transitions, and selectors.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useModeStore, selectIsEditing, selectIsSimulating } from '../useModeStore';
import { DEFAULT_MODE_STATE } from '../../types/mode';
import type { PrimaryMode, EditSubMode, SimulateSubMode } from '../../types/mode';

describe('useModeStore', () => {
    // Reset store to default state before each test
    beforeEach(() => {
        useModeStore.getState().resetMode();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ===========================
    // Initial State Tests
    // ===========================

    describe('initial state', () => {
        it('should start in edit mode by default', () => {
            const state = useModeStore.getState();
            expect(state.primaryMode).toBe('edit');
        });

        it('should have select as default edit sub-mode', () => {
            const state = useModeStore.getState();
            expect(state.editSubMode).toBe('select');
        });

        it('should have observe as default simulate sub-mode', () => {
            const state = useModeStore.getState();
            expect(state.simulateSubMode).toBe('observe');
        });

        it('should match DEFAULT_MODE_STATE', () => {
            const state = useModeStore.getState();
            expect(state.primaryMode).toBe(DEFAULT_MODE_STATE.primaryMode);
            expect(state.editSubMode).toBe(DEFAULT_MODE_STATE.editSubMode);
            expect(state.simulateSubMode).toBe(DEFAULT_MODE_STATE.simulateSubMode);
        });
    });

    // ===========================
    // setPrimaryMode Tests
    // ===========================

    describe('setPrimaryMode', () => {
        it('should switch to simulate mode', () => {
            useModeStore.getState().setPrimaryMode('simulate');

            expect(useModeStore.getState().primaryMode).toBe('simulate');
        });

        it('should switch back to edit mode', () => {
            useModeStore.getState().setPrimaryMode('simulate');
            useModeStore.getState().setPrimaryMode('edit');

            expect(useModeStore.getState().primaryMode).toBe('edit');
        });

        it('should preserve sub-mode state when switching', () => {
            // Set a specific edit sub-mode
            useModeStore.getState().setEditSubMode('sensor');

            // Switch to simulate
            useModeStore.getState().setPrimaryMode('simulate');

            // Edit sub-mode should be preserved
            expect(useModeStore.getState().editSubMode).toBe('sensor');
        });

        it('should accept all valid primary modes', () => {
            const modes: PrimaryMode[] = ['edit', 'simulate'];

            modes.forEach(mode => {
                useModeStore.getState().setPrimaryMode(mode);
                expect(useModeStore.getState().primaryMode).toBe(mode);
            });
        });
    });

    // ===========================
    // togglePrimaryMode Tests
    // ===========================

    describe('togglePrimaryMode', () => {
        it('should toggle from edit to simulate', () => {
            expect(useModeStore.getState().primaryMode).toBe('edit');

            useModeStore.getState().togglePrimaryMode();

            expect(useModeStore.getState().primaryMode).toBe('simulate');
        });

        it('should toggle from simulate to edit', () => {
            useModeStore.getState().setPrimaryMode('simulate');

            useModeStore.getState().togglePrimaryMode();

            expect(useModeStore.getState().primaryMode).toBe('edit');
        });

        it('should toggle back and forth correctly', () => {
            expect(useModeStore.getState().primaryMode).toBe('edit');

            useModeStore.getState().togglePrimaryMode();
            expect(useModeStore.getState().primaryMode).toBe('simulate');

            useModeStore.getState().togglePrimaryMode();
            expect(useModeStore.getState().primaryMode).toBe('edit');

            useModeStore.getState().togglePrimaryMode();
            expect(useModeStore.getState().primaryMode).toBe('simulate');
        });
    });

    // ===========================
    // setEditSubMode Tests
    // ===========================

    describe('setEditSubMode', () => {
        it('should change edit sub-mode', () => {
            useModeStore.getState().setEditSubMode('delete');

            expect(useModeStore.getState().editSubMode).toBe('delete');
        });

        it('should accept all valid edit sub-modes', () => {
            const modes: EditSubMode[] = [
                'select',
                'place',
                'delete',
                'sensor',
                'signal',
                'wire'
            ];

            modes.forEach(mode => {
                useModeStore.getState().setEditSubMode(mode);
                expect(useModeStore.getState().editSubMode).toBe(mode);
            });
        });

        it('should not affect primary mode', () => {
            expect(useModeStore.getState().primaryMode).toBe('edit');

            useModeStore.getState().setEditSubMode('sensor');

            expect(useModeStore.getState().primaryMode).toBe('edit');
        });

        it('should not affect simulate sub-mode', () => {
            useModeStore.getState().setSimulateSubMode('interact');
            useModeStore.getState().setEditSubMode('wire');

            expect(useModeStore.getState().simulateSubMode).toBe('interact');
        });
    });

    // ===========================
    // setSimulateSubMode Tests
    // ===========================

    describe('setSimulateSubMode', () => {
        it('should change simulate sub-mode', () => {
            useModeStore.getState().setSimulateSubMode('interact');

            expect(useModeStore.getState().simulateSubMode).toBe('interact');
        });

        it('should accept all valid simulate sub-modes', () => {
            const modes: SimulateSubMode[] = ['observe', 'interact'];

            modes.forEach(mode => {
                useModeStore.getState().setSimulateSubMode(mode);
                expect(useModeStore.getState().simulateSubMode).toBe(mode);
            });
        });

        it('should not affect primary mode', () => {
            useModeStore.getState().setPrimaryMode('simulate');
            useModeStore.getState().setSimulateSubMode('interact');

            expect(useModeStore.getState().primaryMode).toBe('simulate');
        });
    });

    // ===========================
    // enterEditMode Tests
    // ===========================

    describe('enterEditMode', () => {
        it('should switch to edit mode', () => {
            useModeStore.getState().setPrimaryMode('simulate');

            useModeStore.getState().enterEditMode();

            expect(useModeStore.getState().primaryMode).toBe('edit');
        });

        it('should reset edit sub-mode to select', () => {
            useModeStore.getState().setEditSubMode('wire');
            useModeStore.getState().setPrimaryMode('simulate');

            useModeStore.getState().enterEditMode();

            expect(useModeStore.getState().editSubMode).toBe('select');
        });

        it('should be idempotent when already in edit mode', () => {
            expect(useModeStore.getState().primaryMode).toBe('edit');

            useModeStore.getState().enterEditMode();

            expect(useModeStore.getState().primaryMode).toBe('edit');
            expect(useModeStore.getState().editSubMode).toBe('select');
        });
    });

    // ===========================
    // enterSimulateMode Tests
    // ===========================

    describe('enterSimulateMode', () => {
        it('should switch to simulate mode', () => {
            useModeStore.getState().enterSimulateMode();

            expect(useModeStore.getState().primaryMode).toBe('simulate');
        });

        it('should reset simulate sub-mode to observe', () => {
            useModeStore.getState().setSimulateSubMode('interact');
            useModeStore.getState().enterEditMode();

            useModeStore.getState().enterSimulateMode();

            expect(useModeStore.getState().simulateSubMode).toBe('observe');
        });

        it('should be idempotent when already in simulate mode', () => {
            useModeStore.getState().enterSimulateMode();
            useModeStore.getState().setSimulateSubMode('interact');

            useModeStore.getState().enterSimulateMode();

            expect(useModeStore.getState().primaryMode).toBe('simulate');
            // Sub-mode should reset to observe even if already in simulate
            expect(useModeStore.getState().simulateSubMode).toBe('observe');
        });
    });

    // ===========================
    // resetMode Tests
    // ===========================

    describe('resetMode', () => {
        it('should reset all state to defaults', () => {
            // Modify all state
            useModeStore.getState().setPrimaryMode('simulate');
            useModeStore.getState().setEditSubMode('wire');
            useModeStore.getState().setSimulateSubMode('interact');

            // Reset
            useModeStore.getState().resetMode();

            // Verify all reset
            const state = useModeStore.getState();
            expect(state.primaryMode).toBe('edit');
            expect(state.editSubMode).toBe('select');
            expect(state.simulateSubMode).toBe('observe');
        });
    });

    // ===========================
    // Selector Tests
    // ===========================

    describe('selectors', () => {
        describe('selectIsEditing', () => {
            it('should return true when in edit mode', () => {
                const state = useModeStore.getState();

                expect(selectIsEditing(state)).toBe(true);
            });

            it('should return false when in simulate mode', () => {
                useModeStore.getState().setPrimaryMode('simulate');
                const state = useModeStore.getState();

                expect(selectIsEditing(state)).toBe(false);
            });
        });

        describe('selectIsSimulating', () => {
            it('should return false when in edit mode', () => {
                const state = useModeStore.getState();

                expect(selectIsSimulating(state)).toBe(false);
            });

            it('should return true when in simulate mode', () => {
                useModeStore.getState().setPrimaryMode('simulate');
                const state = useModeStore.getState();

                expect(selectIsSimulating(state)).toBe(true);
            });
        });
    });

    // ===========================
    // Subscription Tests
    // ===========================

    describe('subscriptions', () => {
        it('should notify subscribers on primaryMode change', () => {
            const callback = vi.fn();

            const unsubscribe = useModeStore.subscribe(
                state => state.primaryMode,
                callback
            );

            useModeStore.getState().setPrimaryMode('simulate');

            expect(callback).toHaveBeenCalledWith('simulate', 'edit');

            unsubscribe();
        });

        it('should notify subscribers on editSubMode change', () => {
            const callback = vi.fn();

            const unsubscribe = useModeStore.subscribe(
                state => state.editSubMode,
                callback
            );

            useModeStore.getState().setEditSubMode('sensor');

            expect(callback).toHaveBeenCalledWith('sensor', 'select');

            unsubscribe();
        });

        it('should not notify subscribers when value unchanged', () => {
            const callback = vi.fn();

            const unsubscribe = useModeStore.subscribe(
                state => state.primaryMode,
                callback
            );

            // Set to same value
            useModeStore.getState().setPrimaryMode('edit');

            // Should not trigger (already 'edit')
            expect(callback).not.toHaveBeenCalled();

            unsubscribe();
        });
    });

    // ===========================
    // Integration Tests
    // ===========================

    describe('mode workflow integration', () => {
        it('should handle typical edit workflow', () => {
            // Start in edit mode
            expect(useModeStore.getState().primaryMode).toBe('edit');

            // User selects sensor tool
            useModeStore.getState().setEditSubMode('sensor');
            expect(useModeStore.getState().editSubMode).toBe('sensor');

            // User places some sensors, then switches to wire tool
            useModeStore.getState().setEditSubMode('wire');
            expect(useModeStore.getState().editSubMode).toBe('wire');

            // User goes back to select
            useModeStore.getState().setEditSubMode('select');
            expect(useModeStore.getState().editSubMode).toBe('select');
        });

        it('should handle edit-simulate-edit cycle', () => {
            // Start in edit, modify some things
            useModeStore.getState().setEditSubMode('sensor');

            // Switch to simulate via toggle
            useModeStore.getState().togglePrimaryMode();
            expect(useModeStore.getState().primaryMode).toBe('simulate');
            expect(useModeStore.getState().simulateSubMode).toBe('observe');

            // Watch trains, then interact
            useModeStore.getState().setSimulateSubMode('interact');

            // Back to edit
            useModeStore.getState().togglePrimaryMode();
            expect(useModeStore.getState().primaryMode).toBe('edit');
            // Should reset to select for clean slate
            expect(useModeStore.getState().editSubMode).toBe('select');
        });
    });
});
