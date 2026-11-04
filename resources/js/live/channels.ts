import { LiveConnection } from '@/types/Live';
import { getEcho } from './echo';

type Handler = (payload: never) => void;

interface Entry {
    listeners: number;
}

// A channel is shared by every hook that listens on it, so it is left only
// when the last one stops (Echo's `leave()` drops all listeners at once).
const entries = new Map<string, Entry>();

/**
 * Listen for `event` on a private channel. Returns the function that stops
 * listening and, when nobody else is left, leaves the channel.
 */
export function listenPrivate(
    connection: LiveConnection,
    name: string,
    event: string,
    handler: Handler,
): () => void {
    const echo = getEcho(connection);
    const channel = echo.private(name);
    const entry = entries.get(name) ?? { listeners: 0 };
    entry.listeners += 1;
    entries.set(name, entry);

    // Custom `broadcastAs()` names are listened to with a leading dot.
    channel.listen(`.${event}`, handler);

    return () => {
        channel.stopListening(`.${event}`, handler);
        entry.listeners -= 1;

        if (entry.listeners <= 0) {
            entries.delete(name);
            echo.leave(name);
        }
    };
}
