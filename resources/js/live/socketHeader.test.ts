import { describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    socketId: vi.fn(),
    axiosUse: vi.fn(),
    onRequest: vi.fn(),
}));

vi.mock('./echo', () => ({ currentSocketId: mocks.socketId }));
vi.mock('axios', () => ({
    default: { interceptors: { request: { use: mocks.axiosUse } } },
}));
vi.mock('@inertiajs/core', () => ({ http: { onRequest: mocks.onRequest } }));

import { installSocketHeader } from './socketHeader';

describe('installSocketHeader', () => {
    installSocketHeader();
    const axiosHandler = mocks.axiosUse.mock.calls[0][0] as (c: {
        headers: { set: (k: string, v: string) => void };
    }) => unknown;
    const inertiaHandler = mocks.onRequest.mock.calls[0][0] as (c: {
        headers?: Record<string, string>;
    }) => { headers?: Record<string, string> };

    test('tags axios requests with the socket id', () => {
        mocks.socketId.mockReturnValue('1.2');
        const set = vi.fn();

        axiosHandler({ headers: { set } });

        expect(set).toHaveBeenCalledWith('X-Socket-ID', '1.2');
    });

    test('tags Inertia requests, keeping their other headers', () => {
        mocks.socketId.mockReturnValue('1.2');

        expect(inertiaHandler({ headers: { Accept: 'x' } }).headers).toEqual({
            Accept: 'x',
            'X-Socket-ID': '1.2',
        });
    });

    test('sends nothing extra before the socket is connected', () => {
        mocks.socketId.mockReturnValue(undefined);
        const set = vi.fn();
        const config = { headers: { Accept: 'x' } };

        axiosHandler({ headers: { set } });

        expect(set).not.toHaveBeenCalled();
        expect(inertiaHandler(config)).toBe(config);
    });
});
