import type Echo from 'laravel-echo';
import type Pusher from 'pusher-js';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * laravel-echo and pusher-js are about 35 kB brotli, and only a signed-in
 * user on a Reverb-enabled server needs them, so they are fetched after the
 * page has rendered instead of shipping in the first bundle. Until they are
 * here `useLiveConnection` reports no connection, and every live hook (which
 * does nothing without one) subscribes once it arrives.
 */
interface Libraries {
    Echo: typeof Echo;
    Pusher: typeof Pusher;
}

let libraries: Libraries | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadEchoLibraries(): Promise<void> {
    loading ??= Promise.all([import('laravel-echo'), import('pusher-js')]).then(
        ([echo, pusher]) => {
            libraries = { Echo: echo.default, Pusher: pusher.default };
            listeners.forEach((listener) => listener());
        },
    );

    return loading;
}

/** The loaded libraries; only call once `loadEchoLibraries()` has resolved. */
export function echoLibraries(): Libraries {
    if (!libraries) {
        throw new Error('laravel-echo has not been loaded yet.');
    }

    return libraries;
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

/** Starts the download when live updates are on; true once it has finished. */
export function useEchoReady(enabled: boolean): boolean {
    const ready = useSyncExternalStore(
        subscribe,
        () => libraries !== null,
        () => false,
    );

    useEffect(() => {
        if (enabled && !ready) {
            void loadEchoLibraries();
        }
    }, [enabled, ready]);

    return ready;
}
