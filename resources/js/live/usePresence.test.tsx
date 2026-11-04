import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LiveConfig } from '@/types/Live';

const mocks = vi.hoisted(() => {
    const callbacks: Record<string, (arg?: unknown) => void> = {};
    const channel = {
        here: vi.fn((cb) => ((callbacks.here = cb), channel)),
        joining: vi.fn((cb) => ((callbacks.joining = cb), channel)),
        leaving: vi.fn((cb) => ((callbacks.leaving = cb), channel)),
        whisper: vi.fn(() => channel),
        listenForWhisper: vi.fn(
            (event, cb) => ((callbacks[`whisper:${event}`] = cb), channel),
        ),
    };

    return {
        callbacks,
        channel,
        join: vi.fn(() => channel),
        leave: vi.fn(),
        live: { enabled: false, pollInterval: 0 } as unknown as LiveConfig,
    };
});

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { live: mocks.live } }),
}));
vi.mock('./echo', () => ({
    getEcho: () => ({ join: mocks.join, leave: mocks.leave }),
}));

import { usePresence } from './usePresence';

const enabled: LiveConfig = {
    enabled: true,
    pollInterval: 30,
    key: 'k',
    host: 'h',
    port: 80,
    scheme: 'http',
};
const ada = { id: 2, name: 'Ada', avatar: null };
const me = { id: 1, name: 'Me', avatar: null };

describe('usePresence', () => {
    beforeEach(() => {
        mocks.join.mockClear();
        mocks.leave.mockClear();
        mocks.channel.whisper.mockClear();
        mocks.live = enabled;
    });

    test('does not join while live updates are off', () => {
        mocks.live = { enabled: false, pollInterval: 0 };
        const { result } = renderHook(() => usePresence('issue.5', 1));

        expect(mocks.join).not.toHaveBeenCalled();
        expect(result.current.others).toEqual([]);
    });

    test('lists the others, never the current user, as people come and go', () => {
        const { result } = renderHook(() => usePresence('issue.5', 1));

        expect(mocks.join).toHaveBeenCalledWith('issue.5');

        act(() => mocks.callbacks.here([me, ada]));
        expect(result.current.others).toEqual([ada]);

        const grace = { id: 3, name: 'Grace', avatar: null };
        act(() => mocks.callbacks.joining(grace));
        act(() => mocks.callbacks.joining(grace));
        expect(result.current.others).toEqual([ada, grace]);

        act(() => mocks.callbacks.leaving(ada));
        expect(result.current.others).toEqual([grace]);
    });

    test('passes the editing whispers to the callback', () => {
        const onWhisper = vi.fn();
        renderHook(() => usePresence('issue.5', 1, onWhisper));

        act(() => mocks.callbacks['whisper:editing']({ userId: 2 }));
        act(() => mocks.callbacks['whisper:stopped-editing']({ userId: 2 }));

        expect(onWhisper).toHaveBeenNthCalledWith(1, 'editing', { userId: 2 });
        expect(onWhisper).toHaveBeenNthCalledWith(2, 'stopped-editing', {
            userId: 2,
        });
    });

    test('whispers to the others on the joined channel', () => {
        const { result } = renderHook(() => usePresence('issue.5', 1));

        result.current.whisper('editing', { userId: 1 });

        expect(mocks.channel.whisper).toHaveBeenCalledWith('editing', {
            userId: 1,
        });
    });

    test('leaves the channel and ignores late events after unmount', () => {
        const { result, unmount } = renderHook(() => usePresence('issue.5', 1));

        unmount();
        act(() => mocks.callbacks.here([ada]));

        expect(mocks.leave).toHaveBeenCalledWith('issue.5');
        expect(result.current.others).toEqual([]);
        // A whisper after leaving has no channel to go to.
        result.current.whisper('editing', {});
        expect(mocks.channel.whisper).not.toHaveBeenCalled();
    });
});
