import { useEffect, useRef } from 'react';
import { listenPrivate } from './channels';
import { useLiveConnection } from './useLiveConnection';

type Handlers<Events extends Record<string, unknown>> = {
    [Event in keyof Events & string]?: (payload: Events[Event]) => void;
};

/**
 * Subscribe to a private channel while the component is mounted. `handlers`
 * maps event names (the server's `broadcastAs()`) to callbacks; the latest
 * ones are always used without re-subscribing. `channel` may be several
 * names. A null `channel` (nothing to
 * watch yet) or live updates being off subscribes to nothing.
 */
export function useLiveChannel<Events extends Record<string, unknown>>(
    channel: string | string[] | null,
    handlers: Handlers<Events>,
): void {
    const connection = useLiveConnection();
    const latest = useRef(handlers);
    latest.current = handlers;

    const events = Object.keys(handlers).sort().join('|');
    const channels = (
        Array.isArray(channel) ? channel : channel ? [channel] : []
    ).join('|');

    useEffect(() => {
        if (!connection || !channels || !events) return;

        const stops = channels.split('|').flatMap((name) =>
            events.split('|').map((event) =>
                listenPrivate(connection, name, event, ((payload: unknown) => {
                    (
                        latest.current as Record<
                            string,
                            ((payload: unknown) => void) | undefined
                        >
                    )[event]?.(payload);
                }) as never),
            ),
        );

        return () => stops.forEach((stop) => stop());
    }, [connection?.key, connection?.host, connection?.port, channels, events]);
}
