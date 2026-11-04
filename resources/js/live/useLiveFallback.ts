import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { LiveReload, requestLiveReload } from './reloadQueue';
import { useLiveStatus } from './useLiveStatus';

/** Each tab waits up to this much longer, so open tabs do not poll in lockstep. */
export const POLL_JITTER = 0.2;

/**
 * Keep a page fresh when the socket cannot: re-read the props `reloads()`
 * names every `pollInterval` seconds (the server's LIVE_POLL_INTERVAL) while
 * live updates are off or the socket is down, and once more as soon as the
 * socket comes back, since events sent meanwhile were missed. Only a visible
 * tab polls (the reload queue holds the rest back), and with a healthy socket
 * nothing runs at all.
 *
 * @param scale multiplies the interval, for data that changes less often
 */
export function useLiveFallback(reloads: () => LiveReload[], scale = 1): void {
    const interval = usePage().props.live?.pollInterval ?? 0;
    const status = useLiveStatus();
    const latest = useRef(reloads);
    latest.current = reloads;
    const wasDown = useRef(false);

    const run = () =>
        latest.current().forEach((reload) => requestLiveReload(reload));

    useEffect(() => {
        if (status === 'live') {
            // Back after an outage: catch up on what the socket missed.
            if (wasDown.current) run();
            wasDown.current = false;
            return;
        }

        if (status === 'offline') wasDown.current = true;
        if (interval <= 0 || status === 'connecting') return;

        const wait = interval * 1000 * scale;
        let timer: ReturnType<typeof setTimeout>;
        const schedule = () => {
            timer = setTimeout(
                () => {
                    run();
                    schedule();
                },
                wait * (1 + Math.random() * POLL_JITTER),
            );
        };
        schedule();

        return () => clearTimeout(timer);
    }, [status, interval, scale]);
}
