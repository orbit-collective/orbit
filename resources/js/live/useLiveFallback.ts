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
 * socket comes back (after a short reconnect too), since events sent
 * meanwhile were missed. Only a visible
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
    // Has the socket been healthy at least once, and did it leave that state
    // since (a short reconnect counts: events sent meanwhile are missed too)?
    const wasLive = useRef(false);
    const missedEvents = useRef(false);
    // When the next poll is due. Kept across status changes: an unstable
    // connection flipping between `offline` and `connecting` must not restart
    // the wait every time, or the poll would never fire.
    const dueAt = useRef<number | null>(null);

    const run = () =>
        latest.current().forEach((reload) => requestLiveReload(reload));

    useEffect(() => {
        if (status === 'live') {
            // Back after an outage or a reconnect: catch up on what the socket missed.
            if (missedEvents.current) run();
            missedEvents.current = false;
            wasLive.current = true;
            dueAt.current = null;
            return;
        }

        // The first connection is no outage; being offline, or leaving a
        // healthy connection, is.
        if (wasLive.current || status === 'offline') {
            missedEvents.current = true;
        }
        // The very first connection attempt is not polled; one after an outage
        // is (the socket may stay `connecting` for as long as it keeps failing).
        const inOutage = missedEvents.current;
        if (interval <= 0 || (status === 'connecting' && !inOutage)) return;

        const nextWait = () =>
            interval * 1000 * scale * (1 + Math.random() * POLL_JITTER);
        let timer: ReturnType<typeof setTimeout>;
        const schedule = (delay: number) => {
            timer = setTimeout(() => {
                run();
                const wait = nextWait();
                dueAt.current = Date.now() + wait;
                schedule(wait);
            }, delay);
        };

        if (dueAt.current === null) dueAt.current = Date.now() + nextWait();
        schedule(Math.max(0, dueAt.current - Date.now()));

        return () => clearTimeout(timer);
    }, [status, interval, scale]);
}
