import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LiveConnection, LiveStatus } from '@/types/Live';

const mocks = vi.hoisted(() => ({
    connection: null as LiveConnection | null,
    onLiveStatus: vi.fn(),
    stop: vi.fn(),
    emit: undefined as ((status: LiveStatus) => void) | undefined,
}));

vi.mock('./useLiveConnection', () => ({
    useLiveConnection: () => mocks.connection,
}));
vi.mock('./echo', () => ({
    onLiveStatus: (
        _connection: LiveConnection,
        callback: (status: LiveStatus) => void,
    ) => {
        mocks.onLiveStatus();
        mocks.emit = callback;
        return mocks.stop;
    },
}));

import { useLiveStatus } from './useLiveStatus';

const connection: LiveConnection = {
    enabled: true,
    pollInterval: 30,
    key: 'k',
    host: 'h',
    port: 80,
    scheme: 'http',
};

describe('useLiveStatus', () => {
    beforeEach(() => {
        mocks.onLiveStatus.mockClear();
        mocks.stop.mockClear();
        mocks.connection = null;
    });

    test('is off without a connection and never touches the socket', () => {
        const { result } = renderHook(() => useLiveStatus());

        expect(result.current).toBe('off');
        expect(mocks.onLiveStatus).not.toHaveBeenCalled();
    });

    test('follows the socket and stops listening on unmount', () => {
        mocks.connection = connection;
        const { result, unmount } = renderHook(() => useLiveStatus());

        expect(result.current).toBe('connecting');

        act(() => mocks.emit?.('live'));
        expect(result.current).toBe('live');

        act(() => mocks.emit?.('offline'));
        expect(result.current).toBe('offline');

        unmount();
        expect(mocks.stop).toHaveBeenCalled();
    });

    test('goes back to off when live updates are switched off', () => {
        mocks.connection = connection;
        const { result, rerender } = renderHook(() => useLiveStatus());
        act(() => mocks.emit?.('live'));

        mocks.connection = null;
        rerender();

        expect(result.current).toBe('off');
    });
});
