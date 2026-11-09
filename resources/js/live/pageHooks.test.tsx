import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProjectChange } from '@/types/Live';

const mocks = vi.hoisted(() => ({
    useLiveFallback: vi.fn(),
    useLiveChannel: vi.fn(),
    requestLiveReload: vi.fn(),
    visit: vi.fn(),
}));

vi.mock('./useLiveFallback', () => ({
    useLiveFallback: mocks.useLiveFallback,
}));
vi.mock('./useLiveChannel', () => ({ useLiveChannel: mocks.useLiveChannel }));
vi.mock('./reloadQueue', () => ({
    requestLiveReload: mocks.requestLiveReload,
}));
vi.mock('@inertiajs/react', () => ({ router: { visit: mocks.visit } }));

import { useDashboardLive } from './useDashboardLive';
import { useIssueLive } from './useIssueLive';
import { mergeMissed, useProjectLive } from './useProjectLive';

const change = (
    type: string,
    id: number | null = 1,
    action: ProjectChange['action'] = 'updated',
): ProjectChange => ({ type, id, action });

/** The handler a hook registered for `project.changed`. */
const handler = () =>
    mocks.useLiveChannel.mock.calls.at(-1)![1]['project.changed'] as (p: {
        changes: ProjectChange[];
        actor: number | null;
    }) => void;

beforeEach(() => {
    mocks.useLiveChannel.mockReset();
    mocks.useLiveFallback.mockReset();
    mocks.requestLiveReload.mockReset();
    mocks.visit.mockReset();
    vi.stubGlobal('route', (name: string, id: number) => `/${name}/${id}`);
});

/** What the hook asks the fallback to re-read. */
const fallbackReloads = () => mocks.useLiveFallback.mock.calls.at(-1)![0]();

describe('useProjectLive', () => {
    test('without a socket it re-reads the visible view on a timer', () => {
        const range = {
            current: ['2026-11-01', '2026-11-30'] as [string, string],
        };
        const { rerender } = renderHook(
            ({ view }) => useProjectLive(7, view, range),
            { initialProps: { view: 'List' as const } },
        );

        const only = (index: number) => fallbackReloads()[index].only;

        // The view's data plus the props other people can change.
        expect(only(1)).toEqual(['issues']);
        expect(only(0)).toEqual(
            expect.arrayContaining([
                'project',
                'labels',
                'priorities',
                'issueTypes',
            ]),
        );

        rerender({ view: 'Activity' as unknown as 'List' });
        expect(only(0)).toEqual(
            expect.arrayContaining([
                'activityLogs',
                'labels',
                'issueAbilities',
            ]),
        );

        rerender({ view: 'Calendar' as unknown as 'List' });
        expect(fallbackReloads()).toContainEqual({
            only: ['calendarIssues', 'upcomingDeadlines'],
            data: {
                calendar_from: '2026-11-01',
                calendar_to: '2026-11-30',
            },
        });
    });

    test('listens on the project channel and reloads what the view shows', () => {
        const range = { current: null };
        renderHook(() => useProjectLive(7, 'Board', range));

        expect(mocks.useLiveChannel.mock.calls[0][0]).toBe('project.7');

        handler()({ changes: [change('issue')], actor: 2 });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['issues'],
        });
    });

    test('uses the view and calendar range current at the time of the event', () => {
        const range = {
            current: ['2026-11-01', '2026-11-30'] as [string, string],
        };
        const { rerender } = renderHook(
            ({ view }) => useProjectLive(7, view, range),
            { initialProps: { view: 'List' as const } },
        );
        rerender({ view: 'Calendar' as unknown as 'List' });

        handler()({ changes: [change('issue')], actor: null });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['calendarIssues', 'upcomingDeadlines'],
            data: { calendar_from: '2026-11-01', calendar_to: '2026-11-30' },
        });
    });
});

describe('mergeMissed', () => {
    test('de-duplicates repeated changes', () => {
        expect(
            mergeMissed(
                [change('issue', 1)],
                [change('issue', 1), change('issue', 2)],
            ),
        ).toEqual([change('issue', 1), change('issue', 2)]);
    });

    test('keeps a settings change however many issue edits follow it', () => {
        const edits = Array.from({ length: 80 }, (_, i) => change('issue', i));

        const merged = mergeMissed([change('labels', null)], edits);

        expect(merged).toEqual([
            { type: 'labels', id: null, action: 'bulk' },
            { type: 'issue', id: null, action: 'bulk' },
        ]);
    });
});

describe('useProjectLive missed changes', () => {
    test('a label change is not forgotten after a burst of issue edits', () => {
        const range = { current: null };
        const { rerender } = renderHook(
            ({ view }) => useProjectLive(7, view, range),
            { initialProps: { view: 'Activity' as unknown as 'List' } },
        );

        handler()({ changes: [change('labels', null)], actor: 2 });
        for (let i = 0; i < 60; i++) {
            handler()({ changes: [change('issue', i)], actor: 2 });
        }
        mocks.requestLiveReload.mockClear();

        rerender({ view: 'List' });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['labels', 'issues'],
        });
    });

    const range = { current: null };

    test('re-reads the list when it opens after changes arrived during Activity', () => {
        const { rerender } = renderHook(
            ({ view }) => useProjectLive(7, view, range),
            { initialProps: { view: 'Activity' as unknown as 'List' } },
        );

        handler()({ changes: [change('issue', 5, 'created')], actor: 2 });
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(1);
        mocks.requestLiveReload.mockClear();

        rerender({ view: 'List' });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['issues'],
        });
    });

    test('does not re-read twice for the same changes', () => {
        const { rerender } = renderHook(
            ({ view }) => useProjectLive(7, view, range),
            { initialProps: { view: 'Activity' as unknown as 'List' } },
        );
        handler()({ changes: [change('issue', 5)], actor: 2 });

        rerender({ view: 'List' });
        mocks.requestLiveReload.mockClear();
        rerender({ view: 'Board' as unknown as 'List' });
        rerender({ view: 'Activity' as unknown as 'List' });
        rerender({ view: 'List' });

        expect(mocks.requestLiveReload).not.toHaveBeenCalled();
    });

    test('the list and the board share their data, so switching between them reloads nothing', () => {
        const { rerender } = renderHook(
            ({ view }) => useProjectLive(7, view, range),
            { initialProps: { view: 'List' as const } },
        );
        handler()({ changes: [change('issue', 5)], actor: 2 });
        mocks.requestLiveReload.mockClear();

        rerender({ view: 'Board' as unknown as 'List' });

        expect(mocks.requestLiveReload).not.toHaveBeenCalled();
    });

    test('the calendar catches up on what happened while the list was open', () => {
        const calendarRange = {
            current: ['2026-11-01', '2026-11-30'] as [string, string],
        };
        const { rerender } = renderHook(
            ({ view }) => useProjectLive(7, view, calendarRange),
            { initialProps: { view: 'List' as const } },
        );
        handler()({ changes: [change('issue', 5)], actor: 2 });
        mocks.requestLiveReload.mockClear();

        rerender({ view: 'Calendar' as unknown as 'List' });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['calendarIssues', 'upcomingDeadlines'],
            data: { calendar_from: '2026-11-01', calendar_to: '2026-11-30' },
        });
    });
});

describe('useIssueLive', () => {
    const options = {
        projectId: 3,
        issueId: 5,
        related: [8],
        activityVisible: false,
    };

    test('without a socket it re-reads the issue on a timer', () => {
        const { rerender } = renderHook((props) => useIssueLive(props), {
            initialProps: options,
        });

        expect(fallbackReloads()).toHaveLength(1);
        expect(fallbackReloads()[0].only).toEqual(
            expect.arrayContaining([
                'issue',
                'linkedPullRequests',
                'labels',
                'priorities',
                'issueTypes',
                'issueAbilities',
            ]),
        );
        expect(fallbackReloads()[0].only).not.toContain('activityLogs');

        rerender({ ...options, activityVisible: true });
        expect(fallbackReloads()[0].only).toContain('activityLogs');
    });

    test('re-reads the issue when it changes', () => {
        renderHook(() => useIssueLive(options));

        expect(mocks.useLiveChannel.mock.calls[0][0]).toBe('project.3');

        handler()({ changes: [change('comment', 5, 'created')], actor: 2 });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['issue', 'ancestors', 'linkedPullRequests'],
        });
    });

    test('ignores changes to other issues', () => {
        renderHook(() => useIssueLive(options));

        handler()({ changes: [change('issue', 99)], actor: 2 });

        expect(mocks.requestLiveReload).not.toHaveBeenCalled();
    });

    test('goes back to the project when the issue is deleted', () => {
        renderHook(() => useIssueLive(options));

        handler()({ changes: [change('issue', 5, 'deleted')], actor: 2 });

        expect(mocks.visit).toHaveBeenCalledWith('/projects.show/3');
        expect(mocks.requestLiveReload).not.toHaveBeenCalled();
    });

    test('refreshes the feed only while it is visible', () => {
        const { rerender } = renderHook((props) => useIssueLive(props), {
            initialProps: options,
        });
        rerender({ ...options, activityVisible: true });

        handler()({ changes: [change('issue', 5)], actor: 2 });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: expect.arrayContaining(['activityLogs']),
        });
    });
});

describe('useDashboardLive', () => {
    test('without a socket it refreshes the counters and feed on a timer', () => {
        renderHook(() => useDashboardLive([1]));

        expect(fallbackReloads()[0].only).toEqual(
            expect.arrayContaining([
                'issueStats',
                'productivity_trend',
                'projects',
                'activityLogs',
                'users',
                'issueTypes',
            ]),
        );
    });

    test('listens on every project channel and refreshes the counters', () => {
        renderHook(() => useDashboardLive([1, 2]));

        expect(mocks.useLiveChannel.mock.calls[0][0]).toEqual([
            'project.1',
            'project.2',
        ]);

        handler()({ changes: [change('issue')], actor: 2 });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: [
                'issueStats',
                'productivity_trend',
                'projects',
                'activityLogs',
                'issueTypes',
                'myIssues',
                'deadlines',
            ],
        });
    });

    test('caps the number of channels', () => {
        renderHook(() =>
            useDashboardLive(Array.from({ length: 40 }, (_, i) => i + 1)),
        );

        expect(mocks.useLiveChannel.mock.calls[0][0]).toHaveLength(25);
    });
});
