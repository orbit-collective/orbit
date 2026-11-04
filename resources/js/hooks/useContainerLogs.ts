import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PortalLogLine, PortalLogs } from '@/types/DeveloperPortal';

/** Seconds between refreshes while a viewer is open and following. */
export const LOG_FOLLOW_SECONDS = 3;

export const LOG_TAIL = 200;

interface Options {
    /** Nothing is fetched while false (the row is collapsed). */
    enabled: boolean;
    /** Re-read every few seconds while true. */
    follow: boolean;
}

/**
 * The tail of one container's log, read from the portal's JSON endpoint when
 * the viewer opens, on demand and (while following) on a timer. A request that
 * is still running is never doubled up, and the timer pauses with the tab.
 */
export function useContainerLogs(
    containerId: string,
    { enabled, follow }: Options,
) {
    const [lines, setLines] = useState<PortalLogLine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const inFlight = useRef(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    const refresh = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        setLoading(true);

        try {
            const { data } = await axios.get<PortalLogs>(
                `/settings/dev-portal/containers/${containerId}/logs`,
                { params: { tail: LOG_TAIL } },
            );
            if (!mounted.current) return;
            setLines(data.lines);
            setError(data.error);
        } catch {
            if (mounted.current) setError('Could not load the logs.');
        } finally {
            inFlight.current = false;
            if (mounted.current) {
                setLoading(false);
                setLoaded(true);
            }
        }
    }, [containerId]);

    useEffect(() => {
        if (enabled) void refresh();
    }, [enabled, refresh]);

    useEffect(() => {
        if (!enabled || !follow) return;

        const timer = setInterval(() => {
            if (!document.hidden) void refresh();
        }, LOG_FOLLOW_SECONDS * 1000);

        return () => clearInterval(timer);
    }, [enabled, follow, refresh]);

    return { lines, error, loading, loaded, refresh };
}
