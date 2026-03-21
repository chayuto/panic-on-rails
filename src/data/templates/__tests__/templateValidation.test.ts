/**
 * Template Validation Tests
 *
 * Validates that template JSON files conform to the v2 recipe format.
 * Templates store part placements, not pre-baked geometry.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { TrackTemplate } from '../types';
import { getPartById } from '../../catalog';

const TEMPLATES_DIR = path.resolve(__dirname, '../../../../public/templates');

// Get all template files
function getTemplateFiles(): string[] {
    const files = fs.readdirSync(TEMPLATES_DIR);
    return files.filter(f => f.endsWith('.json') && f !== 'manifest.json');
}

describe('Template JSON Validation', () => {
    const templateFiles = getTemplateFiles();

    it('should find at least one template file', () => {
        expect(templateFiles.length).toBeGreaterThan(0);
    });

    describe.each(templateFiles)('template: %s', (filename) => {
        const filePath = path.join(TEMPLATES_DIR, filename);
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const template: TrackTemplate = JSON.parse(rawContent);

        it('should have valid version', () => {
            expect(template.version).toBe(2);
        });

        it('should have required template metadata', () => {
            expect(template.template).toBeDefined();
            expect(template.template.id).toBeTruthy();
            expect(template.template.name).toBeTruthy();
        });

        it('should have parts array', () => {
            expect(Array.isArray(template.parts)).toBe(true);
            expect(template.parts.length).toBeGreaterThan(0);
        });

        it('should match metadata partCount', () => {
            expect(template.parts.length).toBe(template.template.partCount);
        });

        it('should match metadata trainCount', () => {
            expect(template.trains.length).toBe(template.template.trainCount);
        });

        describe('parts validation', () => {
            it.each(template.parts.map((p, i) => ({ ...p, _index: i })))(
                'part $_index ($partId) should reference a valid catalog part',
                (part) => {
                    const catalogPart = getPartById(part.partId);
                    expect(catalogPart).toBeTruthy();
                }
            );

            it.each(template.parts.map((p, i) => ({ ...p, _index: i })))(
                'part $_index should have valid position and rotation',
                (part) => {
                    expect(typeof part.position.x).toBe('number');
                    expect(typeof part.position.y).toBe('number');
                    expect(typeof part.rotation).toBe('number');
                    expect(part.rotation).toBeGreaterThanOrEqual(0);
                    expect(part.rotation).toBeLessThan(360);
                }
            );
        });

        describe('trains validation', () => {
            it('should have trains array', () => {
                expect(Array.isArray(template.trains)).toBe(true);
            });

            it.each(template.trains.map((t, i) => ({ ...t, _index: i })))(
                'train $_index should reference a valid part index',
                (train) => {
                    expect(train.partIndex).toBeGreaterThanOrEqual(0);
                    expect(train.partIndex).toBeLessThan(template.parts.length);
                }
            );

            it.each(template.trains.map((t, i) => ({ ...t, _index: i })))(
                'train $_index should have a color',
                (train) => {
                    expect(train.color).toBeTruthy();
                    expect(train.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
                }
            );
        });
    });
});
