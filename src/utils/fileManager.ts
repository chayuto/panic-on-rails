import { saveAs } from 'file-saver';
import type { LayoutData } from '../types';

/**
 * Export layout to JSON file
 */
export function exportLayout(layout: LayoutData, filename = 'layout.json'): void {
    const json = JSON.stringify(layout, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    saveAs(blob, filename);
}

/**
 * Import layout from JSON file
 */
export async function importLayout(file: File): Promise<LayoutData> {
    const text = await file.text();
    const data = JSON.parse(text) as LayoutData;

    // Basic validation
    if (!data.nodes || typeof data.nodes !== 'object') {
        throw new Error('Invalid layout: missing nodes');
    }
    if (!data.edges || typeof data.edges !== 'object') {
        throw new Error('Invalid layout: missing edges');
    }

    // Version check (for future compatibility)
    if (data.version && data.version > 1) {
        console.warn(`Layout version ${data.version} may not be fully compatible`);
    }

    return data;
}

/**
 * Create a file input element and trigger file selection
 */
export function openFileDialog(onFileSelected: (file: File) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            onFileSelected(file);
        }
    };
    input.click();
}
