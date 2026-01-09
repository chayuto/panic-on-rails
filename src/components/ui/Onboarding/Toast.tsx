/**
 * Toast - Non-blocking notification for onboarding
 * 
 * Displays celebratory messages or confirmations in the bottom-right
 * corner. Auto-dismisses after a timeout.
 */

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import './Onboarding.css';

interface ToastProps {
    /** Content to display */
    children: ReactNode;

    /** Toast variant affects border color */
    variant?: 'success' | 'info';

    /** Icon to display */
    icon?: string;

    /** Title (bold text) */
    title?: string;

    /** Auto-dismiss after this many milliseconds (0 = no auto-dismiss) */
    duration?: number;

    /** Callback when toast is dismissed */
    onDismiss?: () => void;
}

export function Toast({
    children,
    variant = 'success',
    icon = '🎉',
    title,
    duration = 4000,
    onDismiss,
}: ToastProps) {
    const [visible, setVisible] = useState(true);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        onDismiss?.();
    }, [onDismiss]);

    // Auto-dismiss after duration
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(handleDismiss, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, handleDismiss]);

    if (!visible) {
        return null;
    }

    return (
        <div
            className={`onboarding-toast onboarding-toast--${variant}`}
            role="status"
            aria-live="polite"
        >
            {icon && <span className="onboarding-toast__icon">{icon}</span>}
            <div className="onboarding-toast__content">
                {title && <div className="onboarding-toast__title">{title}</div>}
                <div className="onboarding-toast__message">{children}</div>
            </div>
            <button
                className="onboarding-toast__dismiss"
                onClick={handleDismiss}
                aria-label="Dismiss notification"
            >
                ✕
            </button>
        </div>
    );
}
