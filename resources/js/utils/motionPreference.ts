import { MotionGlobalConfig } from 'framer-motion';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'reducedMotion';

/**
 * Whether the host (a test run, say) already turned animations off. The user's
 * preference can only add to that, never switch animations back on.
 */
const hostSkipsAnimations = Boolean(MotionGlobalConfig.skipAnimations);

const listeners = new Set<() => void>();

const readStored = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

let reduced = typeof window !== 'undefined' && readStored();

/**
 * One switch for every animation in the app: framer-motion's global
 * `skipAnimations` makes each `motion` element, layout animation and
 * `animate()` call jump straight to its final state, so no component needs to
 * know about the preference.
 */
const apply = () => {
    MotionGlobalConfig.skipAnimations = hostSkipsAnimations || reduced;

    // CSS-driven movement (press, hover lift, rotating icons) follows through
    // `html[data-reduced-motion]` in global.css.
    if (typeof document !== 'undefined') {
        document.documentElement.toggleAttribute(
            'data-reduced-motion',
            reduced,
        );
    }
};

apply();

/** Whether the user asked for no animations (Settings > Preferences). */
export function isReducedMotion(): boolean {
    return reduced;
}

export function setReducedMotion(next: boolean): void {
    reduced = next;
    apply();

    try {
        localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
        // Private mode: the choice just lasts until the page is closed.
    }

    listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

export function useReducedMotionPreference(): boolean {
    return useSyncExternalStore(subscribe, isReducedMotion, () => false);
}
