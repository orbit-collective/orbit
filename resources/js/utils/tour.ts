import { TourPlacement } from '@/types/Tour';

export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface PopoverPosition {
    top: number;
    left: number;
    placement: TourPlacement | 'center';
}

const GAP = 14;
const MARGIN = 12;

const OPPOSITE: Record<TourPlacement, TourPlacement> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
};

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, Math.max(min, max)));

const place = (
    target: Rect,
    popover: Size,
    placement: TourPlacement,
): { top: number; left: number } => {
    const centerX = target.left + target.width / 2 - popover.width / 2;
    const centerY = target.top + target.height / 2 - popover.height / 2;

    switch (placement) {
        case 'top':
            return {
                top: target.top - popover.height - GAP,
                left: centerX,
            };
        case 'bottom':
            return { top: target.top + target.height + GAP, left: centerX };
        case 'left':
            return {
                top: centerY,
                left: target.left - popover.width - GAP,
            };
        case 'right':
            return { top: centerY, left: target.left + target.width + GAP };
    }
};

const fits = (
    position: { top: number; left: number },
    popover: Size,
    viewport: Size,
    placement: TourPlacement,
) => {
    if (placement === 'top') return position.top >= MARGIN;
    if (placement === 'left') return position.left >= MARGIN;
    if (placement === 'bottom') {
        return position.top + popover.height <= viewport.height - MARGIN;
    }

    return position.left + popover.width <= viewport.width - MARGIN;
};

/**
 * Whether an element is actually visible in the viewport — off-canvas
 * (mobile sidebar) and `display: none` targets can't be spotlighted.
 */
export const isRectVisible = (rect: Rect, viewport: Size): boolean =>
    rect.width > 0 &&
    rect.height > 0 &&
    rect.left + rect.width > 0 &&
    rect.top + rect.height > 0 &&
    rect.left < viewport.width &&
    rect.top < viewport.height;

/**
 * Picks the popover's top-left corner next to `target`: the preferred side
 * if it fits, otherwise the opposite one, then clamped inside the viewport.
 * Without a target the popover is centered.
 */
export const getPopoverPosition = (
    target: Rect | null,
    popover: Size,
    viewport: Size,
    preferred: TourPlacement = 'bottom',
): PopoverPosition => {
    if (!target) {
        return {
            top: (viewport.height - popover.height) / 2,
            left: (viewport.width - popover.width) / 2,
            placement: 'center',
        };
    }

    const perpendicular: TourPlacement[] =
        preferred === 'left' || preferred === 'right'
            ? ['bottom', 'top']
            : ['right', 'left'];
    const candidates = [preferred, OPPOSITE[preferred], ...perpendicular];

    // First side that fits; otherwise keep the preferred one and clamp.
    let placement = preferred;
    let position = place(target, popover, preferred);
    for (const candidate of candidates) {
        const candidatePosition = place(target, popover, candidate);

        if (fits(candidatePosition, popover, viewport, candidate)) {
            placement = candidate;
            position = candidatePosition;
            break;
        }
    }

    return {
        placement,
        top: clamp(
            position.top,
            MARGIN,
            viewport.height - popover.height - MARGIN,
        ),
        left: clamp(
            position.left,
            MARGIN,
            viewport.width - popover.width - MARGIN,
        ),
    };
};

/**
 * Closes the topmost modal. `Modal` listens for Escape on `window`, so a
 * synthetic Escape is the one hook that works for every modal without
 * threading a close callback through the tour.
 */
export const closeTopModal = (): void => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
};

const FOCUSABLE =
    'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

const focusableIn = (root: HTMLElement | null): HTMLElement[] => {
    if (!root) return [];

    const inside = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));

    return root.matches(FOCUSABLE) ? [root, ...inside] : inside;
};

/** Everything that may hold focus on an interactive step, in Tab order. */
export const getTabStops = (
    target: HTMLElement | null,
    popover: HTMLElement | null,
): HTMLElement[] => [...focusableIn(target), ...focusableIn(popover)];

/**
 * The element Tab (or Shift+Tab) should land on, wrapping at the ends and
 * pulling focus back in when it is somewhere outside `stops`.
 */
export const nextTabStop = (
    stops: HTMLElement[],
    active: Element | null,
    backwards: boolean,
): HTMLElement | null => {
    if (stops.length === 0) return null;

    const index = stops.indexOf(active as HTMLElement);

    if (index === -1) {
        return backwards ? stops[stops.length - 1] : stops[0];
    }

    const next = backwards ? index - 1 : index + 1;

    return stops[(next + stops.length) % stops.length];
};
