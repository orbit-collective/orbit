import { useCallback, useEffect } from 'react';
import { LiveReload, pauseLiveReloads, requestLiveReload } from './reloadQueue';

/** `reload(...)` asks for a coalesced refresh of the given props. */
export function useLiveReload(): (reload: LiveReload) => void {
    return useCallback((reload) => requestLiveReload(reload), []);
}

/** While `paused` is true no live reload runs; queued ones run when it ends. */
export function useLivePause(paused: boolean): void {
    useEffect(() => {
        if (!paused) return;

        return pauseLiveReloads();
    }, [paused]);
}
