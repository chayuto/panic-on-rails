import { Line } from 'react-konva';

interface BackgroundLayerProps {
    width: number;
    height: number;
    zoom: number;
    pan: { x: number; y: number };
    showGrid: boolean;
}

const GRID_SIZE = 50; // Base grid size in pixels
const GRID_COLOR = '#2D2D2D';
const GRID_COLOR_MAJOR = '#3D3D3D';

export function BackgroundLayer({ width, height, zoom, pan, showGrid }: BackgroundLayerProps) {
    if (!showGrid) return null;

    const lines: JSX.Element[] = [];

    // Calculate visible area in world coordinates
    const visibleLeft = -pan.x / zoom;
    const visibleTop = -pan.y / zoom;
    const visibleWidth = width / zoom;
    const visibleHeight = height / zoom;

    // Add some padding
    const padding = GRID_SIZE * 2;
    const startX = Math.floor((visibleLeft - padding) / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor((visibleTop - padding) / GRID_SIZE) * GRID_SIZE;
    const endX = visibleLeft + visibleWidth + padding;
    const endY = visibleTop + visibleHeight + padding;

    // Vertical lines
    for (let x = startX; x <= endX; x += GRID_SIZE) {
        const isMajor = x % (GRID_SIZE * 5) === 0;
        lines.push(
            <Line
                key={`v-${x}`}
                points={[x, startY, x, endY]}
                stroke={isMajor ? GRID_COLOR_MAJOR : GRID_COLOR}
                strokeWidth={isMajor ? 1 : 0.5}
            />
        );
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += GRID_SIZE) {
        const isMajor = y % (GRID_SIZE * 5) === 0;
        lines.push(
            <Line
                key={`h-${y}`}
                points={[startX, y, endX, y]}
                stroke={isMajor ? GRID_COLOR_MAJOR : GRID_COLOR}
                strokeWidth={isMajor ? 1 : 0.5}
            />
        );
    }

    return <>{lines}</>;
}
