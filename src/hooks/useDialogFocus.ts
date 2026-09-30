import { useEffect, type RefObject } from 'react';

/**
 * A dialog takes the focus when it opens, and gives it back to whatever had
 * it (the button that opened it) when it closes, so a keyboard player
 * carries on from where they were (WCAG 2.4.3).
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        ref.current?.focus();
        return () => {
            if (opener?.isConnected) opener.focus();
        };
    }, [ref]);
}
