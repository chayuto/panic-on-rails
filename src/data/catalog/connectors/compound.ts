/**
 * Compound Track Connectors
 *
 * Computes external connectors for compound parts by:
 * 1. Resolving each sub-part's connectors
 * 2. Transforming positions/facades by sub-part offset + rotation
 * 3. Filtering to only externally-exposed connectors
 */

import type { ConnectorNode, PartConnectors } from '../../../types/connector';
import type { CompoundGeometry } from '../types';
import { getPartById } from '../registry';
import { computeConnectors } from './index';
import { normalizeAngle, degreesToRadians } from '../../../utils/angle';

/**
 * Transform a local connector position by an offset and rotation.
 * Applies rotation first (around origin), then translation.
 */
function transformConnector(
    connector: ConnectorNode,
    offset: { x: number; y: number },
    rotation: number
): ConnectorNode {
    const rad = degreesToRadians(rotation);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Rotate local position, then translate by offset
    const worldX = offset.x + cos * connector.localPosition.x - sin * connector.localPosition.y;
    const worldY = offset.y + sin * connector.localPosition.x + cos * connector.localPosition.y;

    return {
        ...connector,
        localPosition: { x: worldX, y: worldY },
        localFacade: normalizeAngle(connector.localFacade + rotation),
    };
}

export function computeCompoundConnectors(geometry: CompoundGeometry): PartConnectors {
    const externalNodes: ConnectorNode[] = [];

    for (const ext of geometry.externalConnectors) {
        // Find the sub-part definition
        const subPartDef = geometry.subParts.find(sp => sp.label === ext.subPart);
        if (!subPartDef) {
            console.warn(`[compound connectors] Sub-part "${ext.subPart}" not found`);
            continue;
        }

        // Resolve the catalog part
        const part = getPartById(subPartDef.partRef);
        if (!part) {
            console.warn(`[compound connectors] Part "${subPartDef.partRef}" not found in registry`);
            continue;
        }

        // Compute the sub-part's connectors
        const subConnectors = computeConnectors(part);

        // Find the specific connector by localId
        const connector = subConnectors.nodes.find(n => n.localId === ext.connector);
        if (!connector) {
            console.warn(`[compound connectors] Connector "${ext.connector}" not found on "${subPartDef.partRef}"`);
            continue;
        }

        // Transform by sub-part's offset and rotation
        const transformed = transformConnector(connector, subPartDef.offset, subPartDef.rotation);

        // Remap localId to the external ID
        externalNodes.push({
            ...transformed,
            localId: ext.externalId,
        });
    }

    return {
        nodes: externalNodes,
        primaryNodeId: externalNodes[0]?.localId ?? 'A1',
    };
}
