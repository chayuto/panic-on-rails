/**
 * Hint - Tooltip-style hint for onboarding
 * 
 * Renders a small popover attached to a target element.
 * Used for contextual explanations during onboarding.
 */

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useOnboardingStore } from '../../../stores/useOnboardingStore';
import './Onboarding.css';

type ArrowPosition = 'left' | 'right' | 'top' | 'bottom';

interface HintProps {
    /** Unique identifier for this hint (for tracking shown/dismissed state) */
    id: string;

    /** Content to display in the hint */
    children: ReactNode;

    /** Position relative to target element */
    position?: ArrowPosition;

    /** Keyboard shortcut to display (e.g., "M") */
    shortcut?: string;

    /** Icon to show before content */
    icon?: string;

    /** Whether hint can be dismissed by clicking X */
    dismissible?: boolean;

    /** Fixed positioning (top, left in pixels) */
    style?: React.CSSProperties;

    /** Optional callback when dismissed */
    onDismiss?: () => void;
}

export function Hint({
    id,
    children,
    position = 'right',
    shortcut,
    icon,
    dismissible = true,
    style,
    onDismiss,
}: HintProps) {
    const { shouldShowHint, dismissHint, markHintShown } = useOnboardingStore();
    const [visible, setVisible] = useState(true);

    // Mark hint as shown on mount
    useEffect(() => {
        markHintShown(id);
    }, [id, markHintShown]);

    // Check if hint was previously dismissed
    const isAllowedToShow = shouldShowHint(id);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        dismissHint(id);
        onDismiss?.();
    }, [id, dismissHint, onDismiss]);

    if (!visible || !isAllowedToShow) {
        return null;
    }

    return (
        <div
            className={`onboarding-hint onboarding-hint--arrow-${position}`}
            style={style}
            role="tooltip"
        >
            {dismissible && (
                <button
                    className="onboarding-hint__dismiss"
                    onClick={handleDismiss}
                    aria-label="Dismiss hint"
                >
                    ✕
                </button>
            )}
            <div className="onboarding-hint__content">
                {icon && <span className="onboarding-hint__icon">{icon}</span>}
                {children}
                {shortcut && (
                    <span className="onboarding-hint__shortcut">{shortcut}</span>
                )}
            </div>
        </div>
    );
}
