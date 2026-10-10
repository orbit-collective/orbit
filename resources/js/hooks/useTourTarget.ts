import { isRectVisible, Rect } from '@/utils/tour';
import { useEffect, useState } from 'react';

export type TourTargetState =
    | { status: 'idle' }
    | { status: 'searching' }
    | { status: 'found'; rect: Rect }
    | { status: 'missing' };

const SEARCH_TIMEOUT_MS = 2500;

const measure = (element: Element): Rect | null => {
    const { top, left, width, height } = element.getBoundingClientRect();
    const rect = { top, left, width, height };

    return isRectVisible(rect, {
        width: window.innerWidth,
        height: window.innerHeight,
    })
        ? rect
        : null;
};

/**
 * Locates the `data-tour` element and keeps its rect fresh while the
 * layout shifts (resize, scroll, late-rendered pages after navigation).
 * Reports `missing` if it never shows up — or is hidden — so the tour can
 * fall back to a centered card instead of getting stuck.
 */
export default function useTourTarget(
    target: string | undefined,
    enabled: boolean,
): TourTargetState {
    const [state, setState] = useState<TourTargetState>({ status: 'idle' });

    useEffect(() => {
        if (!enabled || !target) {
            setState({ status: 'idle' });
            return;
        }

        setState({ status: 'searching' });

        const selector = `[data-tour="${target}"]`;
        let frame = 0;
        let element: Element | null = null;

        const update = () => {
            element = element?.isConnected
                ? element
                : document.querySelector(selector);
            const rect = element ? measure(element) : null;

            setState((previous) => {
                if (rect) {
                    const unchanged =
                        previous.status === 'found' &&
                        previous.rect.top === rect.top &&
                        previous.rect.left === rect.left &&
                        previous.rect.width === rect.width &&
                        previous.rect.height === rect.height;

                    return unchanged ? previous : { status: 'found', rect };
                }

                // Don't flip a located target back to "searching".
                return previous.status === 'found'
                    ? { status: 'searching' }
                    : previous;
            });
        };

        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        };

        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
        });
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', schedule, true);

        const timeout = window.setTimeout(() => {
            setState((previous) =>
                previous.status === 'found' ? previous : { status: 'missing' },
            );
        }, SEARCH_TIMEOUT_MS);

        update();

        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(timeout);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', schedule, true);
        };
    }, [target, enabled]);

    return state;
}
