import { RefObject, useEffect } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The keyboard behaviour of a modal dialog: focus moves in when it opens
 * (to the element marked `data-autofocus`, else the first control), Tab and
 * Shift+Tab stay inside it, and focus goes back to where it was when it closes.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        const previous = document.activeElement as HTMLElement | null;
        const controls = () =>
            Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));

        (
            dialog.querySelector<HTMLElement>('[data-autofocus]') ??
            controls()[0]
        )?.focus();

        const trap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            const items = controls();
            if (items.length === 0) return;

            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;

            if (
                event.shiftKey &&
                (active === first || !dialog.contains(active))
            ) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        dialog.addEventListener('keydown', trap);

        return () => {
            dialog.removeEventListener('keydown', trap);
            previous?.focus?.();
        };
    }, [ref]);
}
