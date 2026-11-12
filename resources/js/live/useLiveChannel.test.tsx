import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LiveConfig } from '@/types/Live';

const mocks = vi.hoisted(() => {
    const listen = vi.fn();
    const stopListening = vi.fn();
    const leave = vi.fn();
    const privateChannel = vi.fn(() => ({ listen, stopListening }));

    return {
        listen,
        stopListening,
        leave,
        privateChannel,
        live: { enabled: false, pollInterval: 0 } as unknown as LiveConfig,
    };
});

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { live: mocks.live } }),
}));
// The socket libraries load lazily; these tests start with them ready.
vi.mock('./echoLoader', () => ({ useEchoReady: () => true }));
vi.mock('./echo', () => ({
    getEcho: () => ({ private: mocks.privateChannel, leave: mocks.leave }),
}));

import { useLiveChannel } from './useLiveChannel';

const enabled: LiveConfig = {
    enabled: true,
    pollInterval: 30,
    key: 'k',
    host: 'h',
    port: 80,
    scheme: 'http',
};

describe('useLiveChannel', () => {
    beforeEach(() => {
        mocks.listen.mockReset();
        mocks.stopListening.mockReset();
        mocks.leave.mockReset();
        mocks.privateChannel.mockClear();
        mocks.live = enabled;
    });

    test('does nothing while live updates are off', () => {
        mocks.live = { enabled: false, pollInterval: 0 };
        renderHook(() => useLiveChannel('project.1', { 'a.b': vi.fn() }));

        expect(mocks.privateChannel).not.toHaveBeenCalled();
    });

    test('does nothing without a channel or without handlers', () => {
        renderHook(() => useLiveChannel(null, { 'a.b': vi.fn() }));
        renderHook(() => useLiveChannel('project.1', {}));

        expect(mocks.privateChannel).not.toHaveBeenCalled();
    });

    test('listens with the dotted custom event name and leaves on unmount', () => {
        const { unmount } = renderHook(() =>
            useLiveChannel('project.1', { 'project.changed': vi.fn() }),
        );

        expect(mocks.privateChannel).toHaveBeenCalledWith('project.1');
        expect(mocks.listen).toHaveBeenCalledWith(
            '.project.changed',
            expect.any(Function),
        );

        unmount();

        expect(mocks.stopListening).toHaveBeenCalledWith(
            '.project.changed',
            expect.any(Function),
        );
        expect(mocks.leave).toHaveBeenCalledWith('project.1');
    });

    test('calls the latest handler without resubscribing', () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = renderHook(
            ({ handler }) => useLiveChannel('project.1', { 'a.b': handler }),
            { initialProps: { handler: first } },
        );

        rerender({ handler: second });
        const callback = mocks.listen.mock.calls[0][1] as (p: unknown) => void;
        callback({ x: 1 });

        expect(mocks.listen).toHaveBeenCalledTimes(1);
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith({ x: 1 });
    });

    test('subscribes to several channels and leaves each', () => {
        const { unmount } = renderHook(() =>
            useLiveChannel(['project.1', 'project.2'], { 'a.b': vi.fn() }),
        );

        expect(mocks.privateChannel).toHaveBeenCalledWith('project.1');
        expect(mocks.privateChannel).toHaveBeenCalledWith('project.2');

        unmount();

        expect(mocks.leave).toHaveBeenCalledTimes(2);
    });

    test('keeps a shared channel open until its last listener is gone', () => {
        const a = renderHook(() =>
            useLiveChannel('project.1', { 'a.b': vi.fn() }),
        );
        const b = renderHook(() =>
            useLiveChannel('project.1', { 'c.d': vi.fn() }),
        );

        a.unmount();
        expect(mocks.leave).not.toHaveBeenCalled();

        b.unmount();
        expect(mocks.leave).toHaveBeenCalledTimes(1);
    });
});
