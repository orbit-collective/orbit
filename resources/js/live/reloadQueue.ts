import { router } from '@inertiajs/react';

export interface LiveReload {
    /** Props to re-fetch (Inertia `only`); empty re-reads the whole page. */
    only?: string[];
    data?: Record<string, string>;
}

/** Wait this long for more changes before reloading. */
export const RELOAD_DEBOUNCE_MS = 250;

/** Never wait longer than this while changes keep arriving. */
export const RELOAD_MAX_WAIT_MS = 1500;

const queue = new Map<string, { reload: LiveReload; firstAt: number }>();
let timer: ReturnType<typeof setTimeout> | null = null;
let pauses = 0;

const keyOf = ({ only, data }: LiveReload) =>
    JSON.stringify([[...(only ?? [])].sort(), data ?? null]);

const canRun = () =>
    pauses === 0 && (typeof document === 'undefined' || !document.hidden);

function run() {
    timer = null;
    if (!canRun()) return;

    const batch = [...queue.values()];
    queue.clear();

    for (const { reload } of batch) {
        router.reload({
            only: reload.only,
            data: reload.data,
            // `reload` keeps scroll position and component state by default.
            // Runs next to a visit the user starts instead of cancelling it.
            async: true,
        });
    }
}

function schedule() {
    if (timer) clearTimeout(timer);
    const oldest = Math.min(...[...queue.values()].map((q) => q.firstAt));
    const wait = Math.max(
        0,
        Math.min(RELOAD_DEBOUNCE_MS, oldest + RELOAD_MAX_WAIT_MS - Date.now()),
    );
    timer = setTimeout(run, wait);
}

/**
 * Ask for a page refresh. Requests are coalesced: the same reload asked for
 * many times (a burst of changes) is one request, and a reload is held back
 * while the tab is hidden or something paused them (a drag in progress) and
 * runs as soon as that ends.
 */
export function requestLiveReload(reload: LiveReload): void {
    const key = keyOf(reload);
    if (!queue.has(key)) queue.set(key, { reload, firstAt: Date.now() });
    schedule();
}

/** Hold reloads back (e.g. while a card is being dragged). Returns the release. */
export function pauseLiveReloads(): () => void {
    pauses += 1;
    let released = false;

    return () => {
        if (released) return;
        released = true;
        pauses -= 1;
        if (queue.size > 0) schedule();
    };
}

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && queue.size > 0) schedule();
    });
}

/** Test helper: forget queued reloads and timers. */
export function resetLiveReloads(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    queue.clear();
    pauses = 0;
}
