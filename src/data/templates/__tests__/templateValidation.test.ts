/**
 * Template Validation Tests
 *
 * Validates that template JSON files conform to expected types.
 * Catches issues like switchBranches being an object instead of array.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { TrackTemplate } from '../types';
import type { TrackNode, TrackEdge } from '../../../types';

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
            expect(template.version).toBe(1);
        });

        it('should have required template metadata', () => {
            expect(template.template).toBeDefined();
            expect(template.template.id).toBeTruthy();
            expect(template.template.name).toBeTruthy();
        });

        it('should have valid layout structure', () => {
            expect(template.layout).toBeDefined();
            expect(template.layout.nodes).toBeDefined();
            expect(template.layout.edges).toBeDefined();
        });

        describe('nodes validation', () => {
            const nodes = Object.values(template.layout.nodes) as TrackNode[];

            it('should have at least one node', () => {
                expect(nodes.length).toBeGreaterThan(0);
            });

            it.each(nodes.filter(n => n.type === 'switch'))(
                'switch node $id should have switchBranches as array',
                (node) => {
                    expect(node.switchBranches).toBeDefined();
                    expect(Array.isArray(node.switchBranches)).toBe(true);
                    expect(node.switchBranches).toHaveLength(2);
                    // Each element should be a string (EdgeId)
                    node.switchBranches!.forEach(edgeId => {
                        expect(typeof edgeId).toBe('string');
                    });
                }
            );

            it.each(nodes.filter(n => n.type === 'switch'))(
                'switch node $id should have switchState as 0 or 1',
                (node) => {
                    expect(node.switchState).toBeDefined();
                    expect([0, 1]).toContain(node.switchState);
                }
            );

            it.each(nodes)(
                'node $id connections should reference existing edges',
                (node) => {
                    const edgeIds = Object.keys(template.layout.edges);
                    node.connections.forEach(connId => {
                        expect(edgeIds).toContain(connId);
                    });
                }
            );
        });

        describe('edges validation', () => {
            const edges = Object.values(template.layout.edges) as TrackEdge[];

            it('should have at least one edge', () => {
                expect(edges.length).toBeGreaterThan(0);
            });

            it.each(edges)(
                'edge $id should reference existing nodes',
                (edge) => {
                    const nodeIds = Object.keys(template.layout.nodes);
                    expect(nodeIds).toContain(edge.startNodeId);
                    expect(nodeIds).toContain(edge.endNodeId);
                }
            );

            it.each(edges)(
                'edge $id should have valid geometry type',
                (edge) => {
                    expect(['straight', 'arc']).toContain(edge.geometry.type);
                }
            );
        });

        describe('trains validation', () => {
            it('should have trains array', () => {
                expect(Array.isArray(template.trains)).toBe(true);
            });

            it.each(template.trains)(
                'train on edge $edgeId should reference existing edge',
                (train) => {
                    const edgeIds = Object.keys(template.layout.edges);
                    expect(edgeIds).toContain(train.edgeId);
                }
            );
        });
    });
});
