/**
 * FileActions - File operation buttons for the toolbar
 * 
 * Handles:
 * - New layout (with confirmation)
 * - Template loading
 * - Save to file (JSON export)
 * - Load from file (JSON import)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useSimulationStore } from '../../../stores/useSimulationStore';
import { exportLayout, importLayout } from '../../../utils/fileManager';
import { getTemplateList, loadTemplate, applyTemplate } from '../../../data/templates';
import type { TemplateMetadata } from '../../../data/templates';

// Custom confirmation modal component
function ConfirmModal({
    isOpen,
    message,
    onConfirm,
    onCancel
}: {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div
            className="confirm-modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
            }}
            onClick={onCancel}
        >
            <div
                className="confirm-modal"
                style={{
                    backgroundColor: '#1e1e2e',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    minWidth: '300px',
                    border: '1px solid #45475a',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <p style={{
                    margin: '0 0 20px 0',
                    color: '#cdd6f4',
                    fontSize: '16px',
                }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #45475a',
                            backgroundColor: 'transparent',
                            color: '#cdd6f4',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#f38ba8',
                            color: '#1e1e2e',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        Clear Layout
                    </button>
                </div>
            </div>
        </div>
    );
}

export function FileActions() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { getLayout, loadLayout, clearLayout, edges } = useTrackStore();
    const { spawnTrain, clearTrains, setRunning } = useSimulationStore();

    // Template state
    const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    // Confirm modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Load templates on mount
    useEffect(() => {
        getTemplateList().then(setTemplates);
    }, []);

    // Template loading handler
    const handleLoadTemplate = useCallback(async (templateId: string) => {
        if (!templateId) return;

        if (Object.keys(edges).length > 0) {
            if (!confirm('Load template? This will clear your current layout.')) {
                return;
            }
        }

        setLoadingTemplate(true);
        try {
            // Clear persisted stores first
            localStorage.removeItem('panic-on-rails-track-v1');
            localStorage.removeItem('panic-on-rails-simulation-v1');
            localStorage.removeItem('panic-on-rails-logic-v1');

            const template = await loadTemplate(templateId);
            applyTemplate(
                template,
                clearLayout,
                loadLayout as (data: unknown) => void,
                spawnTrain,
                () => setRunning(true),
                true // autoStart
            );
        } catch (error) {
            console.error('Failed to load template:', error);
            alert('Failed to load template');
        } finally {
            setLoadingTemplate(false);
        }
    }, [edges, clearLayout, loadLayout, spawnTrain, setRunning]);

    // File operations
    const handleSave = useCallback(() => {
        const layout = getLayout();
        exportLayout(layout, `panic-on-rails-${Date.now()}.json`);
    }, [getLayout]);

    const handleLoad = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const layout = await importLayout(file);
            loadLayout(layout);
        } catch (err) {
            console.error('Failed to load layout:', err);
            alert('Failed to load layout. Please check the file format.');
        }

        // Reset input
        e.target.value = '';
    }, [loadLayout]);

    const handleNewClick = useCallback(() => {
        console.log('[FileActions] handleNewClick - edges:', Object.keys(edges).length);
        if (Object.keys(edges).length > 0) {
            // Show custom modal instead of native confirm
            setShowConfirmModal(true);
        } else {
            // No tracks, just clear directly
            performClear();
        }
    }, [edges]);

    const performClear = useCallback(() => {
        console.log('[FileActions] performClear - clearing layout');

        // Clear persisted stores from localStorage
        localStorage.removeItem('panic-on-rails-track-v1');
        localStorage.removeItem('panic-on-rails-simulation-v1');
        localStorage.removeItem('panic-on-rails-logic-v1');
        localStorage.removeItem('panic-on-rails-budget-v1');

        clearLayout();
        clearTrains();

        console.log('[FileActions] ✅ Layout cleared!');
    }, [clearLayout, clearTrains]);

    const handleConfirm = useCallback(() => {
        setShowConfirmModal(false);
        performClear();
    }, [performClear]);

    const handleCancel = useCallback(() => {
        setShowConfirmModal(false);
        console.log('[FileActions] User cancelled');
    }, []);

    return (
        <>
            <button onClick={handleNewClick} title="New Layout">
                📄 New
            </button>
            <select
                value=""
                onChange={(e) => handleLoadTemplate(e.target.value)}
                disabled={loadingTemplate}
                title="Load Template"
                className="template-selector"
            >
                <option value="">📋 Templates...</option>
                {templates.map(t => (
                    <option key={t.id} value={t.id}>
                        {t.name} ({t.difficulty})
                    </option>
                ))}
            </select>
            <button onClick={handleSave} title="Save to File">
                💾 Save
            </button>
            <button onClick={handleLoad} title="Load from File">
                📂 Load
            </button>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden-input"
                onChange={handleFileChange}
            />

            {/* Custom confirmation modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                message="Clear current layout? This cannot be undone."
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </>
    );
}
