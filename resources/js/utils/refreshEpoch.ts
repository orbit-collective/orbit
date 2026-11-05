import { useSyncExternalStore } from 'react';

/**
 * A counter that goes up each time the user presses a page's Refresh button.
 * Animated components include it in their keys / effects so a refresh plays
 * their entrance again, which a data reload alone never does (their React
 * elements are the same ones, so nothing mounts).
 */
let epoch = 0;
const listeners = new Set<() => void>();

export function bumpRefreshEpoch(): void {
    epoch += 1;
    listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

/** The current refresh count: 0 until the first refresh. */
export function useRefreshEpoch(): number {
    return useSyncExternalStore(
        subscribe,
        () => epoch,
        () => 0,
    );
}
