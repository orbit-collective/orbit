import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { LiveConnection } from '@/types/Live';

const mocks = vi.hoisted(() => ({
    ctor: vi.fn(),
    disconnect: vi.fn(),
    post: vi.fn(),
}));

const pusher = vi.hoisted(() => ({
    state: 'connecting',
    bind: vi.fn(),
    unbind: vi.fn(),
}));

vi.mock('laravel-echo', () => ({
    default: class {
        constructor(options: unknown) {
            mocks.ctor(options);
        }
        disconnect = mocks.disconnect;
        socketId = () => '12.34';
        connector = { pusher: { connection: pusher } };
    },
}));
vi.mock('pusher-js', () => ({ default: class {} }));
vi.mock('axios', () => ({ default: { post: mocks.post } }));

import { currentSocketId, disconnectEcho, getEcho, onLiveStatus } from './echo';
import { loadEchoLibraries } from './echoLoader';

const connection: LiveConnection = {
    enabled: true,
    pollInterval: 30,
    key: 'abc',
    host: 'ws.example.com',
    port: 443,
    scheme: 'https',
};

beforeAll(async () => {
    await loadEchoLibraries();
});

describe('getEcho', () => {
    afterEach(() => {
        disconnectEcho();
        mocks.ctor.mockReset();
        mocks.disconnect.mockReset();
        mocks.post.mockReset();
    });

    test('creates one instance and reuses it for the same connection', () => {
        expect(getEcho(connection)).toBe(getEcho({ ...connection }));
        expect(mocks.ctor).toHaveBeenCalledTimes(1);
    });

    test('connects to the configured endpoint with TLS only for https', () => {
        getEcho(connection);

        expect(mocks.ctor).toHaveBeenCalledWith(
            expect.objectContaining({
                broadcaster: 'reverb',
                key: 'abc',
                wsHost: 'ws.example.com',
                wssPort: 443,
                forceTLS: true,
            }),
        );

        disconnectEcho();
        getEcho({ ...connection, scheme: 'http', port: 8080 });

        expect(mocks.ctor).toHaveBeenLastCalledWith(
            expect.objectContaining({ wsPort: 8080, forceTLS: false }),
        );
    });

    test('replaces the instance when the connection changes', () => {
        getEcho(connection);
        getEcho({ ...connection, key: 'other' });

        expect(mocks.disconnect).toHaveBeenCalledTimes(1);
        expect(mocks.ctor).toHaveBeenCalledTimes(2);
    });

    test('authorises private channels through axios', async () => {
        mocks.post.mockResolvedValue({ data: { auth: 'signature' } });
        getEcho(connection);

        const { authorizer } = mocks.ctor.mock.calls[0][0] as {
            authorizer: (c: { name: string }) => {
                authorize: (
                    id: string,
                    cb: (e: Error | null, d?: unknown) => void,
                ) => void;
            };
        };
        const callback = vi.fn();
        authorizer({ name: 'private-user.1' }).authorize('1.2', callback);
        await vi.waitFor(() => expect(callback).toHaveBeenCalled());

        expect(mocks.post).toHaveBeenCalledWith('/broadcasting/auth', {
            socket_id: '1.2',
            channel_name: 'private-user.1',
        });
        expect(callback).toHaveBeenCalledWith(null, { auth: 'signature' });
    });

    test('reports an authorisation failure to Echo', async () => {
        const failure = new Error('403');
        mocks.post.mockRejectedValue(failure);
        getEcho(connection);

        const { authorizer } = mocks.ctor.mock.calls[0][0] as {
            authorizer: (c: { name: string }) => {
                authorize: (id: string, cb: (e: Error | null) => void) => void;
            };
        };
        const callback = vi.fn();
        authorizer({ name: 'private-project.9' }).authorize('1.2', callback);
        await vi.waitFor(() =>
            expect(callback).toHaveBeenCalledWith(failure, null),
        );
    });

    test("exposes this tab's socket id once connected", () => {
        expect(currentSocketId()).toBeUndefined();

        getEcho(connection);

        expect(currentSocketId()).toBe('12.34');
    });
});

describe('onLiveStatus', () => {
    afterEach(() => {
        disconnectEcho();
        pusher.bind.mockReset();
        pusher.unbind.mockReset();
        pusher.state = 'connecting';
    });

    test('reports the current state, then every change', () => {
        const seen: string[] = [];
        pusher.state = 'connected';

        onLiveStatus(connection, (status) => seen.push(status));
        const listener = pusher.bind.mock.calls[0][1] as (s: {
            current: string;
        }) => void;

        for (const current of ['unavailable', 'connecting', 'failed', 'x']) {
            listener({ current });
        }

        expect(seen).toEqual([
            'live',
            'offline',
            'connecting',
            'offline',
            'connecting',
        ]);
    });

    test('stops listening when asked', () => {
        const stop = onLiveStatus(connection, vi.fn());

        stop();

        expect(pusher.unbind).toHaveBeenCalledWith(
            'state_change',
            pusher.bind.mock.calls[0][1],
        );
    });
});
