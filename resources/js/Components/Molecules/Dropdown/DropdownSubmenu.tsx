import {
    KeyboardEvent as ReactKeyboardEvent,
    ReactNode,
    RefObject,
    useLayoutEffect,
    useCallback,
    useEffect,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import DropdownPanel from '@/Components/Atoms/DropdownPanel/DropdownPanel';
import { DropdownOptionItem } from '@/types/Dropdown';

const WIDTH = 208;
const GAP = 2;
const MARGIN = 12;
// Lines the first child up with the row that opened the flyout.
const PANEL_PADDING = 6;

interface DropdownSubmenuProps {
    id: string;
    panelRef: RefObject<HTMLDivElement | null>;
    /** The row that opened it. */
    anchor: HTMLElement;
    /** The menu it flies out of; the flyout sits beside it, not over it. */
    parentPanel: HTMLElement | null;
    items: DropdownOptionItem[];
    ariaLabel: string;
    /** Move focus into the flyout (keyboard opened it). */
    focusFirst: boolean;
    renderRow: (option: DropdownOptionItem) => ReactNode;
    /** Back to the parent menu, optionally handing focus to the opening row. */
    onClose: (restoreFocus: boolean) => void;
    /** Leave the whole menu (Tab). */
    onCloseAll: () => void;
}

/**
 * The flyout of a `Dropdown` row that has `children`. It is portaled like the
 * main panel, opens to the right of it (flipping to the left when the window
 * has no room) and stays inside the viewport.
 */
export default function DropdownSubmenu({
    id,
    panelRef,
    anchor,
    parentPanel,
    items,
    ariaLabel,
    focusFirst,
    renderRow,
    onClose,
    onCloseAll,
}: DropdownSubmenuProps) {
    // Null until measured: the flyout stays invisible, so it never shows at
    // (0, 0) before it is placed. The layout effect below runs before paint.
    const [style, setStyle] = useState<{ top: number; left: number } | null>(
        null,
    );

    const updatePosition = useCallback(() => {
        const panel = panelRef.current;
        const anchorRect = anchor.getBoundingClientRect();
        const parentRect = (parentPanel ?? anchor).getBoundingClientRect();
        const height = panel?.offsetHeight ?? 0;

        let left = parentRect.right + GAP;
        if (left + WIDTH > window.innerWidth - MARGIN) {
            left = parentRect.left - WIDTH - GAP;
        }
        left = Math.max(
            MARGIN,
            Math.min(left, window.innerWidth - WIDTH - MARGIN),
        );

        const top = Math.max(
            MARGIN,
            Math.min(
                anchorRect.top - PANEL_PADDING,
                window.innerHeight - MARGIN - height,
            ),
        );

        setStyle((previous) =>
            previous && previous.top === top && previous.left === left
                ? previous
                : { top, left },
        );
    }, [anchor, parentPanel, panelRef]);

    useLayoutEffect(() => {
        updatePosition();
    }, [updatePosition, items]);

    useEffect(() => {
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [updatePosition]);

    const getNavItems = () =>
        Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
                '[data-nav]:not(:disabled)',
            ) ?? [],
        );

    useEffect(() => {
        if (!focusFirst) return;

        const rows = getNavItems();
        (
            rows.find((row) => row.getAttribute('aria-checked') === 'true') ??
            rows[0]
        )?.focus({ preventScroll: true });
        // Only when the flyout first appears.
    }, []);

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        // Keys here must not reach the parent menu's own handler (the flyout
        // is portaled but still a React child of it).
        event.stopPropagation();

        if (event.key === 'Escape' || event.key === 'ArrowLeft') {
            event.preventDefault();
            // Escape would otherwise also reach the document listener that
            // closes the whole dropdown.
            event.nativeEvent.stopImmediatePropagation();
            onClose(true);
            return;
        }

        if (event.key === 'Tab') {
            onCloseAll();
            return;
        }

        const rows = getNavItems();
        if (rows.length === 0) return;

        const current = rows.indexOf(document.activeElement as HTMLElement);
        let next: number | null = null;

        if (event.key === 'ArrowDown') next = (current + 1) % rows.length;
        else if (event.key === 'ArrowUp')
            next = current <= 0 ? rows.length - 1 : current - 1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = rows.length - 1;

        if (next !== null) {
            event.preventDefault();
            rows[next].focus();
        }
    };

    return createPortal(
        <DropdownPanel
            ref={panelRef}
            id={id}
            role="menu"
            aria-label={ariaLabel}
            data-dropdown-submenu
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleKeyDown}
            style={{
                position: 'fixed',
                zIndex: 10000,
                width: WIDTH,
                maxHeight: window.innerHeight - 2 * MARGIN,
                // The panel's `duration-100` would otherwise animate `top`/`left`
                // (`transition-property: all`), gliding it in from (0, 0).
                transition: 'none',
                ...(style ?? { top: 0, left: 0, visibility: 'hidden' }),
            }}
            className="space-y-0.5 overflow-y-auto p-1.5"
        >
            {items.map(renderRow)}
        </DropdownPanel>,
        document.body,
    );
}
