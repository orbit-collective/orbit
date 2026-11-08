import { describe, expect, test } from 'vitest';
import { ProjectChange } from '@/types/Live';
import {
    dashboardFallbackReloads,
    dashboardReloads,
    deletesIssue,
    issuePageFallbackReloads,
    issuePageReloads,
    projectPageFallbackReloads,
    projectPageReloads,
} from './changeProps';

const change = (
    type: string,
    id: number | null = 1,
    action: ProjectChange['action'] = 'updated',
): ProjectChange => ({ type, id, action });

describe('projectPageReloads', () => {
    test('a list or board re-reads the issues for an issue or comment change', () => {
        for (const view of ['List', 'Board'] as const) {
            expect(projectPageReloads([change('issue')], view, null)).toEqual([
                { only: ['issues'] },
            ]);
            expect(projectPageReloads([change('comment')], view, null)).toEqual(
                [{ only: ['issues'] }],
            );
        }
    });

    test('settings changes re-read their own prop and the issues', () => {
        expect(
            projectPageReloads(
                [change('labels', null), change('priorities', null)],
                'List',
                null,
            ),
        ).toEqual([{ only: ['labels', 'priorities', 'issues'] }]);
        expect(
            projectPageReloads([change('issue-types', null)], 'Board', null),
        ).toEqual([{ only: ['issueTypes', 'issues'] }]);
    });

    test('a project change re-reads the project, the sidebar list and the issues', () => {
        expect(projectPageReloads([change('project')], 'List', null)).toEqual([
            { only: ['project', 'projects', 'issues'] },
        ]);
    });

    test('the calendar re-reads its own range, never the table', () => {
        expect(
            projectPageReloads([change('issue')], 'Calendar', [
                '2026-11-01',
                '2026-11-30',
            ]),
        ).toEqual([
            {
                only: ['calendarIssues', 'upcomingDeadlines'],
                data: {
                    calendar_from: '2026-11-01',
                    calendar_to: '2026-11-30',
                },
            },
        ]);
    });

    test('the calendar waits for a range before reloading its issues', () => {
        expect(projectPageReloads([change('issue')], 'Calendar', null)).toEqual(
            [],
        );
        expect(
            projectPageReloads([change('labels', null)], 'Calendar', null),
        ).toEqual([{ only: ['labels'] }]);
    });

    test('the activity view re-reads only the feed, for any change', () => {
        expect(
            projectPageReloads(
                [change('issue'), change('labels')],
                'Activity',
                null,
            ),
        ).toEqual([{ only: ['activityLogs'] }]);
    });

    test('a membership or role change re-reads the whole page', () => {
        for (const view of ['List', 'Board', 'Calendar', 'Activity'] as const) {
            expect(
                projectPageReloads([change('members', null)], view, null),
            ).toEqual([{}]);
            expect(
                projectPageReloads([change('roles', 3)], view, null),
            ).toEqual([{}]);
        }
    });

    test('an unrelated change reloads nothing', () => {
        expect(projectPageReloads([change('other')], 'List', null)).toEqual([]);
    });
});

describe('issuePageReloads', () => {
    test('re-reads the issue when it, or something it shows, changed', () => {
        const only = ['issue', 'ancestors', 'linkedPullRequests'];

        expect(issuePageReloads([change('issue', 5)], 5, [], false)).toEqual([
            { only },
        ]);
        expect(issuePageReloads([change('comment', 5)], 5, [], false)).toEqual([
            { only },
        ]);
        expect(issuePageReloads([change('issue', 8)], 5, [8], false)).toEqual([
            { only },
        ]);
        expect(
            issuePageReloads([change('issue', null, 'bulk')], 5, [], false),
        ).toEqual([{ only }]);
    });

    test('ignores other issues', () => {
        expect(issuePageReloads([change('issue', 9)], 5, [8], false)).toEqual(
            [],
        );
        expect(issuePageReloads([change('comment', 9)], 5, [], false)).toEqual(
            [],
        );
    });

    test('adds the activity feed only while it is on screen', () => {
        expect(issuePageReloads([change('issue', 5)], 5, [], true)).toEqual([
            {
                only: [
                    'issue',
                    'ancestors',
                    'linkedPullRequests',
                    'activityLogs',
                    'queryParams',
                ],
            },
        ]);
    });

    test('settings and project changes refresh what the issue displays', () => {
        expect(
            issuePageReloads([change('labels', null)], 5, [], false),
        ).toEqual([{ only: ['issue', 'labels'] }]);
        expect(issuePageReloads([change('project')], 5, [], false)).toEqual([
            { only: ['project', 'issue'] },
        ]);
    });

    test('a membership change re-reads the whole page', () => {
        expect(
            issuePageReloads([change('members', null)], 5, [], false),
        ).toEqual([{}]);
    });
});

describe('dashboardReloads', () => {
    test('re-reads the counters, trend, projects and feed for issue activity', () => {
        const expected = [
            {
                only: [
                    'issueStats',
                    'productivity_trend',
                    'projects',
                    'activityLogs',
                    'issueTypes',
                ],
            },
        ];

        for (const type of [
            'issue',
            'comment',
            'project',
            'labels',
            'members',
        ]) {
            expect(dashboardReloads([change(type)])).toEqual(expected);
        }
    });

    test('ignores changes that do not show on the dashboard', () => {
        expect(dashboardReloads([change('other')])).toEqual([]);
    });

    test('re-reads only the props the dashboard has loaded', () => {
        expect(
            dashboardReloads([change('issue')], ['projects', 'issueStats']),
        ).toEqual([{ only: ['issueStats', 'projects'] }]);
    });

    test('re-reads nothing when no data prop is loaded', () => {
        expect(dashboardReloads([change('issue')], [])).toEqual([]);
    });
});

describe('deletesIssue', () => {
    test('is true only for the deletion of that very issue', () => {
        expect(deletesIssue([change('issue', 5, 'deleted')], 5)).toBe(true);
        expect(deletesIssue([change('issue', 6, 'deleted')], 5)).toBe(false);
        expect(deletesIssue([change('issue', 5, 'updated')], 5)).toBe(false);
        expect(deletesIssue([change('comment', 5, 'deleted')], 5)).toBe(false);
    });
});

describe('fallback reloads', () => {
    const SETTINGS_AND_ACCESS = [
        'labels',
        'priorities',
        'issueTypes',
        'users',
        'issueAbilities',
        'projectRole',
    ];

    test('a list or board page re-reads its issues and everything other people can change', () => {
        for (const view of ['List', 'Board'] as const) {
            expect(projectPageFallbackReloads(view, null)).toEqual([
                {
                    only: [
                        'project',
                        'projects',
                        ...SETTINGS_AND_ACCESS,
                        'roles',
                    ],
                },
                { only: ['issues'] },
            ]);
        }
    });

    test('the calendar re-reads its range, and waits for one', () => {
        expect(
            projectPageFallbackReloads('Calendar', [
                '2026-11-01',
                '2026-11-30',
            ]),
        ).toContainEqual({
            only: ['calendarIssues', 'upcomingDeadlines'],
            data: { calendar_from: '2026-11-01', calendar_to: '2026-11-30' },
        });
        expect(projectPageFallbackReloads('Calendar', null)).toHaveLength(1);
    });

    test('the activity view re-reads its feed and the settings', () => {
        expect(projectPageFallbackReloads('Activity', null)).toEqual([
            { only: ['activityLogs', ...SETTINGS_AND_ACCESS] },
        ]);
    });

    test('an issue page re-reads the issue, its settings and access, and the feed only when open', () => {
        const closed = issuePageFallbackReloads(false)[0].only!;
        const open = issuePageFallbackReloads(true)[0].only!;

        expect(closed).toEqual(
            expect.arrayContaining([
                'issue',
                'ancestors',
                'linkedPullRequests',
                'project',
                ...SETTINGS_AND_ACCESS,
            ]),
        );
        expect(closed).not.toContain('activityLogs');
        expect(open).toEqual(
            expect.arrayContaining(['activityLogs', 'queryParams']),
        );
    });

    test('the dashboard re-reads its counters, feed and lookups', () => {
        expect(dashboardFallbackReloads()[0].only).toEqual([
            'issueStats',
            'productivity_trend',
            'projects',
            'activityLogs',
            'users',
            'issueTypes',
        ]);
    });

    test('the dashboard timer skips what a hidden widget would have loaded', () => {
        expect(dashboardFallbackReloads(['projects', 'users'])).toEqual([
            { only: ['projects', 'users'] },
        ]);
        expect(dashboardFallbackReloads([])).toEqual([]);
    });
});
