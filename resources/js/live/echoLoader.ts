import type Echo from 'laravel-echo';
import type Pusher from 'pusher-js';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * laravel-echo and pusher-js are about 35 kB brotli, and only a signed-in
 * user on a Reverb-enabled server needs them, so they are fetched after the
 * page has rendered instead of shipping in the first bundle. Until they are
 * here `useLiveConnection` reports no connection, and every live hook (which
 * does nothing without one) subscribes once it arrives.
 *
 * A failed download is not final: it is reported as `failed` (the status
 * becomes `offline`, so the polling fallback keeps the page fresh) and tried
 * again after a pause that grows to a minute, or at once when the browser
 * comes back online.
 */
interface Libraries {
    Echo: typeof Echo;
    Pusher: typeof Pusher;
}

export type EchoState = 'idle' | 'loading' | 'ready' | 'failed';

const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;

let libraries: Libraries | null = null;
let loading: Promise<void> | null = null;
let state: EchoState = 'idle';
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let listeningOnline = false;
const listeners = new Set<() => void>();

function setState(next: EchoState): void {
    if (state === next) {
        return;
    }

    state = next;
    listeners.forEach((listener) => listener());
}

function retryNow(): void {
    if (state === 'failed') {
        void loadEchoLibraries();
    }
}

function scheduleRetry(): void {
    if (retryTimer) {
        clearTimeout(retryTimer);
    }

    const wait = Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS);
    retryTimer = setTimeout(retryNow, wait);

    if (!listeningOnline && typeof window !== 'undefined') {
        window.addEventListener('online', retryNow);
        listeningOnline = true;
    }
}

export function echoState(): EchoState {
    return state;
}

/** Never rejects: a failure is reported through `echoState()` and retried. */
export function loadEchoLibraries(): Promise<void> {
    if (libraries) {
        return Promise.resolve();
    }

    loading ??= (async () => {
        setState('loading');

        try {
            const [echo, pusher] = await Promise.all([
                import('laravel-echo'),
                import('pusher-js'),
            ]);

            libraries = { Echo: echo.default, Pusher: pusher.default };
            failures = 0;

            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }

            setState('ready');
        } catch {
            loading = null;
            failures += 1;
            setState('failed');
            scheduleRetry();
        }
    })();

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
    const current = useSyncExternalStore(subscribe, echoState, () => 'idle');

    useEffect(() => {
        if (enabled && current === 'idle') {
            void loadEchoLibraries();
        }
    }, [enabled, current]);

    return current === 'ready';
}

/** True while the download has failed and is waiting to be tried again. */
export function useEchoFailed(): boolean {
    return (
        useSyncExternalStore(subscribe, echoState, () => 'idle') === 'failed'
    );
}
