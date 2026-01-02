/**
 * SignalLayer - Renders signal lights at track nodes
 * 
 * Signals appear as red/green circles with a post.
 */

import { Group, Circle, Line } from 'react-konva';
import { useLogicStore } from '../../stores/useLogicStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { playSound } from '../../utils/audioManager';
import type { Signal } from '../../types';

const SIGNAL_RADIUS = 8;

/**
 * Individual signal component
 */
function SignalEntity({ signal }: { signal: Signal }) {
    const { nodes } = useTrackStore();
    const { toggleSignal, removeSignal } = useLogicStore();
    const { mode } = useEditorStore();

    const node = nodes[signal.nodeId];
    if (!node) return null;

    const signalX = node.position.x + signal.offset.x;
    const signalY = node.position.y + signal.offset.y;

    const fillColor = signal.state === 'green' ? '#00FF88' : '#FF4444';
    const glowColor = signal.state === 'green' ? '#00FF88' : '#FF4444';

    const handleClick = () => {
        if (mode === 'signal') {
            // In signal mode, shift+click removes, click toggles
            removeSignal(signal.id);
        } else if (mode === 'edit' || mode === 'simulate') {
            toggleSignal(signal.id);
            playSound('switch');
        }
    };

    return (
        <Group onClick={handleClick} onTap={handleClick}>
            {/* Post connecting signal to track */}
            <Line
                points={[
                    node.position.x, node.position.y,
                    signalX, signalY,
                ]}
                stroke="#666"
                strokeWidth={3}
                lineCap="round"
            />
            {/* Signal light with glow */}
            <Circle
                x={signalX}
                y={signalY}
                radius={SIGNAL_RADIUS + 4}
                fill="transparent"
                shadowColor={glowColor}
                shadowBlur={15}
                shadowOpacity={0.8}
            />
            {/* Signal housing (dark circle) */}
            <Circle
                x={signalX}
                y={signalY}
                radius={SIGNAL_RADIUS + 2}
                fill="#222"
                stroke="#444"
                strokeWidth={1}
            />
            {/* Signal light */}
            <Circle
                x={signalX}
                y={signalY}
                radius={SIGNAL_RADIUS}
                fill={fillColor}
                shadowColor={glowColor}
                shadowBlur={8}
            />
        </Group>
    );
}

/**
 * SignalLayer - Renders all signals
 */
export function SignalLayer() {
    const { signals } = useLogicStore();

    return (
        <Group>
            {Object.values(signals).map((signal) => (
                <SignalEntity key={signal.id} signal={signal} />
            ))}
        </Group>
    );
}
