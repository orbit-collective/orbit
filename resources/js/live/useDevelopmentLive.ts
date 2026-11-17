import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { DEVELOPMENT_KINDS, DevelopmentKind } from '@/types/Development';
import { ProjectChangedPayload } from '@/types/Live';
import { useLiveChannel } from './useLiveChannel';
import { useLiveStatus } from './useLiveStatus';

/** Changes that arrive together (a burst of check events) are one reload. */
export const DEVELOPMENT_LIVE_DEBOUNCE_MS = 1500;

/**
 * GitHub changes the relay never hears about (a push to another branch, an
 * issue, a branch created elsewhere) cannot be announced, so even a healthy
 * socket is backed by a slow refresh of everything while the tab is visible.
 */
export const DEVELOPMENT_SAFETY_REFRESH_MS = 5 * 60 * 1000;

/** Each tab waits up to this much longer, so open tabs do not poll in lockstep. */
const JITTER = 0.2;

interface DevelopmentLiveHandlers {
    /** Someone else changed something the view shows: read just those kinds again (the server's cache is already dropped). */
    onChange: (kinds: DevelopmentKind[]) => void;
    /** The socket cannot say anything: read again on a timer (from the server's cache, which is short-lived). */
    onPoll: () => void;
    /** A slow sweep for what the socket never hears of: drop the server's cache and read again. */
    onSafetyRefresh: () => void;
}

/**
 * The kinds of data a change of the project announces for this view:
 * `development.pulls` and the like name one, a bare `development` (older
 * servers) means all of them, anything else is none.
 */
function kindsOf(change: { type: string }): DevelopmentKind[] {
    if (change.type === 'development') return [...DEVELOPMENT_KINDS];

    const kind = change.type.startsWith('development.')
        ? change.type.slice('development.'.length)
        : null;

    return DEVELOPMENT_KINDS.includes(kind as DevelopmentKind)
        ? [kind as DevelopmentKind]
        : [];
}

/**
 * Keeps the Development view in step with GitHub:
 *
 * - a `development.{kind}` change on the project's live channel (announced by
 *   the server for every write from the view and every pull request, check
 *   or review event) reloads just that kind of data, after a short pause so a
 *   burst is one reload; the person's own changes are skipped, they already reloaded;
 * - without a working socket the view polls at the server's
 *   `LIVE_POLL_INTERVAL`, and once more when the socket comes back, since
 *   events sent meanwhile were missed;
 * - a visible tab sweeps everything every few minutes whatever the socket does.
 *
 * A hidden tab never reloads.
 */
export function useDevelopmentLive(
    projectId: number,
    handlers: DevelopmentLiveHandlers,
): void {
    const page = usePage();
    const me = (page.props as { auth?: { user?: { id: number } } }).auth?.user
        ?.id;
    const interval =
        (page.props as { live?: { pollInterval?: number } }).live
            ?.pollInterval ?? 0;
    const status = useLiveStatus();
    const latest = useRef(handlers);
    latest.current = handlers;
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // The kinds announced since the last reload: a burst of different ones is one reload of their union.
    const pendingKinds = useRef(new Set<DevelopmentKind>());
    const wasLive = useRef(false);
    const missed = useRef(false);

    const visible = () =>
        typeof document === 'undefined' ||
        document.visibilityState !== 'hidden';

    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        `project.${projectId}`,
        {
            'project.changed': ({ changes, actor }) => {
                const kinds = changes.flatMap(kindsOf);
                if (kinds.length === 0) return;
                if (actor !== null && actor === me) return;

                kinds.forEach((kind) => pendingKinds.current.add(kind));
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => {
                    timer.current = null;
                    const due = [...pendingKinds.current];
                    pendingKinds.current.clear();
                    if (visible()) latest.current.onChange(due);
                }, DEVELOPMENT_LIVE_DEBOUNCE_MS);
            },
        },
    );

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    // Back after an outage: events sent meanwhile were missed.
    useEffect(() => {
        if (status === 'live') {
            if (missed.current) latest.current.onChange([...DEVELOPMENT_KINDS]);
            missed.current = false;
            wasLive.current = true;
        } else if (wasLive.current || status === 'offline') {
            missed.current = true;
        }
    }, [status]);

    // No socket: poll.
    useEffect(() => {
        if (status === 'live' || interval <= 0) return;

        const id = setInterval(
            () => {
                if (visible()) latest.current.onPoll();
            },
            interval * 1000 * (1 + Math.random() * JITTER),
        );

        return () => clearInterval(id);
    }, [status, interval]);

    // The slow sweep.
    useEffect(() => {
        const id = setInterval(() => {
            if (visible()) latest.current.onSafetyRefresh();
        }, DEVELOPMENT_SAFETY_REFRESH_MS);

        return () => clearInterval(id);
    }, []);
}
