import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LiveStatus, ProjectChangedPayload } from '@/types/Live';
import {
    DEVELOPMENT_LIVE_DEBOUNCE_MS,
    DEVELOPMENT_SAFETY_REFRESH_MS,
    useDevelopmentLive,
} from './useDevelopmentLive';

const mocks = vi.hoisted(() => ({
    status: 'live' as string,
    props: { auth: { user: { id: 1 } }, live: { pollInterval: 30 } } as Record<
        string,
        unknown
    >,
    handler: null as null | ((payload: ProjectChangedPayload) => void),
    channel: null as string | null,
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: mocks.props }),
}));
vi.mock('./useLiveStatus', () => ({
    useLiveStatus: () => mocks.status as LiveStatus,
}));
vi.mock('./useLiveChannel', () => ({
    useLiveChannel: (
        channel: string,
        handlers: {
            'project.changed': (payload: ProjectChangedPayload) => void;
        },
    ) => {
        mocks.channel = channel;
        mocks.handler = handlers['project.changed'];
    },
}));

const handlers = () => ({
    onChange: vi.fn(),
    onPoll: vi.fn(),
    onSafetyRefresh: vi.fn(),
});

const change = (
    type: string,
    actor: number | null = 2,
): ProjectChangedPayload => ({
    changes: [{ type, id: null, action: 'updated' }],
    actor,
});

beforeEach(() => {
    vi.useFakeTimers();
    mocks.status = 'live';
    mocks.props = { auth: { user: { id: 1 } }, live: { pollInterval: 30 } };
    Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useDevelopmentLive', () => {
    test('listens on the project channel and reloads after a pause for a development change by someone else', () => {
        const h = handlers();
        renderHook(() => useDevelopmentLive(7, h));

        expect(mocks.channel).toBe('project.7');
        mocks.handler!(change('development'));
        expect(h.onChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(DEVELOPMENT_LIVE_DEBOUNCE_MS);
        expect(h.onChange).toHaveBeenCalledTimes(1);
    });

    test('a burst of changes is one reload', () => {
        const h = handlers();
        renderHook(() => useDevelopmentLive(7, h));

        mocks.handler!(change('development'));
        vi.advanceTimersByTime(500);
        mocks.handler!(change('development'));
        vi.advanceTimersByTime(500);
        mocks.handler!(change('development', null));
        vi.advanceTimersByTime(DEVELOPMENT_LIVE_DEBOUNCE_MS);

        expect(h.onChange).toHaveBeenCalledTimes(1);
    });

    test("ignores changes of other kinds and the person's own", () => {
        const h = handlers();
        renderHook(() => useDevelopmentLive(7, h));

        mocks.handler!(change('issue'));
        mocks.handler!(change('development', 1));
        vi.advanceTimersByTime(DEVELOPMENT_LIVE_DEBOUNCE_MS * 2);

        expect(h.onChange).not.toHaveBeenCalled();
    });

    test('a hidden tab does not reload', () => {
        const h = handlers();
        renderHook(() => useDevelopmentLive(7, h));
        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            configurable: true,
        });

        mocks.handler!(change('development'));
        vi.advanceTimersByTime(DEVELOPMENT_LIVE_DEBOUNCE_MS);

        expect(h.onChange).not.toHaveBeenCalled();
    });

    test('with a healthy socket nothing polls, but a slow sweep still drops the cache and reads again', () => {
        const h = handlers();
        renderHook(() => useDevelopmentLive(7, h));

        vi.advanceTimersByTime(DEVELOPMENT_SAFETY_REFRESH_MS - 1);
        expect(h.onSafetyRefresh).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(h.onSafetyRefresh).toHaveBeenCalledTimes(1);
        expect(h.onPoll).not.toHaveBeenCalled();
    });

    test("without a socket it polls at the server's interval, only while visible", () => {
        mocks.status = 'off';
        const h = handlers();
        renderHook(() => useDevelopmentLive(7, h));

        vi.advanceTimersByTime(30_000 * 1.2 + 1);
        expect(h.onPoll).toHaveBeenCalledTimes(1);

        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            configurable: true,
        });
        vi.advanceTimersByTime(60_000);
        expect(h.onPoll).toHaveBeenCalledTimes(1);
    });

    test('does not poll when the server turned polling off', () => {
        mocks.status = 'off';
        mocks.props = { auth: { user: { id: 1 } }, live: { pollInterval: 0 } };
        const h = handlers();
        renderHook(() => useDevelopmentLive(7, h));

        vi.advanceTimersByTime(10 * 60_000);

        expect(h.onPoll).not.toHaveBeenCalled();
    });

    test('catches up once when the socket comes back after an outage', () => {
        mocks.status = 'live';
        const h = handlers();
        const { rerender } = renderHook(() => useDevelopmentLive(7, h));
        expect(h.onChange).not.toHaveBeenCalled();

        mocks.status = 'offline';
        rerender();
        mocks.status = 'live';
        rerender();

        expect(h.onChange).toHaveBeenCalledTimes(1);
    });
});
