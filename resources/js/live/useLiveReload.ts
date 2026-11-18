import { useEffect } from 'react';
import { pauseLiveReloads } from './reloadQueue';

/** While `paused` is true no live reload runs; queued ones run when it ends. */
export function useLivePause(paused: boolean): void {
    useEffect(() => {
        if (!paused) return;

        return pauseLiveReloads();
    }, [paused]);
}
