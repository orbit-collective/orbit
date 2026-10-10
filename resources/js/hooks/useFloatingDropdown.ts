import {
    DropdownAlign,
    DropdownPlacement,
    FloatingPosition,
} from '@/types/Dropdown';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

const GAP = 6;
const VIEWPORT_MARGIN = 12;
// Rough panel height used to decide whether to flip above the trigger.
const FLIP_THRESHOLD = 260;
const MIN_PANEL_HEIGHT = 160;
const MIN_TRIGGER_WIDTH = 180;

interface UseFloatingDropdownOptions {
    placement?: DropdownPlacement;
    align?: DropdownAlign;
    /** Panel width in px, or `trigger` to match the trigger's width. */
    width?: number | 'trigger';
    /** Controlled open state; omit to let the hook own it. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Anchor the panel to a point (e.g. a right-click) instead of the trigger. */
    anchorPoint?: { x: number; y: number } | null;
}

/**
 * Behavior shared by every dropdown: open state (controlled or not), a
 * viewport-aware fixed position for a panel rendered into a portal, closing
 * on outside click / Escape, and handing focus back to the trigger.
 * The visuals live in `Dropdown`, `DropdownPanel` and `DropdownOption`.
 */
export function useFloatingDropdown({
    placement = 'bottom',
    align = 'start',
    width = 224,
    open,
    onOpenChange,
    anchorPoint,
}: UseFloatingDropdownOptions = {}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const isOpenRef = useRef(isOpen);
    isOpenRef.current = isOpen;

    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<FloatingPosition | null>(null);

    const setIsOpen = useCallback(
        (next: boolean | ((previous: boolean) => boolean)) => {
            const resolved =
                typeof next === 'function' ? next(isOpenRef.current) : next;

            if (resolved === isOpenRef.current) return;
            if (!isControlled) setInternalOpen(resolved);
            onOpenChange?.(resolved);
        },
        [isControlled, onOpenChange],
    );

    const focusTrigger = useCallback(() => {
        triggerRef.current
            ?.querySelector<HTMLElement>('button, [href], [tabindex]')
            ?.focus();
    }, []);

    const close = useCallback(
        (restoreFocus = false) => {
            setIsOpen(false);
            if (restoreFocus) focusTrigger();
        },
        [setIsOpen, focusTrigger],
    );

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger && !anchorPoint) return;

        const rect = anchorPoint
            ? new DOMRect(anchorPoint.x, anchorPoint.y, 0, 0)
            : trigger!.getBoundingClientRect();
        const panelWidth =
            width === 'trigger'
                ? Math.max(rect.width, MIN_TRIGGER_WIDTH)
                : width;
        const spaceBelow =
            window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
        const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;

        // Never taller than what is really left, nor than the viewport.
        const cap = (space: number) =>
            Math.min(
                Math.max(space, MIN_PANEL_HEIGHT),
                window.innerHeight - 2 * VIEWPORT_MARGIN,
            );

        let side = placement;
        if (side === 'bottom' && spaceBelow < FLIP_THRESHOLD) {
            if (spaceAbove > spaceBelow) side = 'top';
        } else if (side === 'top' && spaceAbove < FLIP_THRESHOLD) {
            if (spaceBelow > spaceAbove) side = 'bottom';
        }

        const preferredLeft =
            align === 'end' ? rect.right - panelWidth : rect.left;
        const left = Math.max(
            VIEWPORT_MARGIN,
            Math.min(
                preferredLeft,
                window.innerWidth - panelWidth - VIEWPORT_MARGIN,
            ),
        );

        setPosition({
            side,
            style:
                side === 'bottom'
                    ? {
                          top: rect.bottom + GAP,
                          left,
                          width: panelWidth,
                          maxHeight: cap(spaceBelow),
                      }
                    : {
                          bottom: window.innerHeight - rect.top + GAP,
                          left,
                          width: panelWidth,
                          maxHeight: cap(spaceAbove),
                      },
        });
    }, [placement, align, width, anchorPoint]);

    useLayoutEffect(() => {
        if (isOpen) updatePosition();
        else setPosition(null);
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (!isOpen) return;

        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                panelRef.current?.contains(target)
            ) {
                return;
            }
            setIsOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close(true);
        };

        // Follow the trigger while the page moves, but once it has scrolled
        // out of the window the panel would slide off-screen with it.
        const reposition = () => {
            const trigger = triggerRef.current;

            if (!anchorPoint && trigger) {
                const { top, bottom } = trigger.getBoundingClientRect();

                if (bottom < 0 || top > window.innerHeight) {
                    setIsOpen(false);
                    return;
                }
            }

            updatePosition();
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [isOpen, setIsOpen, close, updatePosition, anchorPoint]);

    return {
        isOpen,
        setIsOpen,
        close,
        focusTrigger,
        triggerRef,
        panelRef,
        position,
    };
}
