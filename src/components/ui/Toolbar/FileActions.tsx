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

export function FileActions() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { getLayout, loadLayout, clearLayout, edges } = useTrackStore();
    const { spawnTrain, clearTrains, setRunning } = useSimulationStore();

    // Template state
    const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(false);

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

    const handleNew = useCallback(() => {
        if (Object.keys(edges).length > 0) {
            if (!confirm('Clear current layout?')) return;
        }
        // Clear persisted stores from localStorage
        localStorage.removeItem('panic-on-rails-track-v1');
        localStorage.removeItem('panic-on-rails-simulation-v1');
        localStorage.removeItem('panic-on-rails-logic-v1');
        localStorage.removeItem('panic-on-rails-budget-v1');

        clearLayout();
        clearTrains();

        // Reset view helper (optional, if we had one)
        console.log('Layout cleared - New Project started');
    }, [edges, clearLayout, clearTrains]);

    return (
        <>
            <button onClick={handleNew} title="New Layout">
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
        </>
    );
}
