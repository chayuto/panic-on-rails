import { saveAs } from 'file-saver';
import type { LayoutData } from '../types';
import { LayoutDataSchema, type ValidatedLayoutData } from '../schemas/layout';

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
    const rawData = JSON.parse(text);

    // Validate using Zod schema
    const result = LayoutDataSchema.safeParse(rawData);

    if (!result.success) {
        console.error('Validation error:', result.error);
        throw new Error(`Invalid layout file: ${result.error.issues[0]?.message}`);
    }

    // Zod-validated data is structurally compatible with LayoutData
    const validated: ValidatedLayoutData = result.data;
    return validated as LayoutData;
}
