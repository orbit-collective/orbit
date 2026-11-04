import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher, { type ChannelAuthorizationCallback } from 'pusher-js';
import { LiveConnection } from '@/types/Live';

type Reverb = Echo<'reverb'>;
type AuthData = Parameters<ChannelAuthorizationCallback>[1];

let instance: Reverb | null = null;
let signature = '';

const signatureOf = (c: LiveConnection) =>
    `${c.scheme}://${c.host}:${c.port}/${c.key}`;

/**
 * The one Echo instance for the page, created on first use. Private channels
 * are authorised through `POST /broadcasting/auth` with axios, so the session
 * cookie and the XSRF token travel exactly like every other request (Echo's
 * own XHR only knows a csrf-token meta tag, which this app does not render).
 */
export function getEcho(connection: LiveConnection): Reverb {
    const next = signatureOf(connection);

    if (instance && signature === next) {
        return instance;
    }

    disconnectEcho();

    // Echo reads the Pusher client from `window`.
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    instance = new Echo({
        broadcaster: 'reverb',
        key: connection.key,
        wsHost: connection.host,
        wsPort: connection.port,
        wssPort: connection.port,
        forceTLS: connection.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel: { name: string }) => ({
            authorize: (
                socketId: string,
                callback: ChannelAuthorizationCallback,
            ) => {
                axios
                    .post('/broadcasting/auth', {
                        socket_id: socketId,
                        channel_name: channel.name,
                    })
                    .then((response) =>
                        callback(null, response.data as AuthData),
                    )
                    .catch((error: Error) => callback(error, null));
            },
        }),
    });
    signature = next;

    return instance;
}

/** Echo's id for this browser tab's socket, once connected (sent as X-Socket-ID). */
export function currentSocketId(): string | undefined {
    return instance?.socketId();
}

export function disconnectEcho(): void {
    instance?.disconnect();
    instance = null;
    signature = '';
}
