import { describe, expect, test } from 'vitest';
import { DashboardIssueRow } from '@/types/Dashboard';
import {
    filterDeadlines,
    groupDeadlines,
    sortIssues,
    summarizeWeek,
} from './dashboardIssues';

const NOW = new Date(2026, 10, 10, 12, 0);

const row = (
    id: number,
    overrides: Partial<DashboardIssueRow> = {},
): DashboardIssueRow => ({
    id,
    number: id,
    title: `Issue ${id}`,
    projectId: 1,
    projectName: 'Orbit',
    projectColor: 'purple',
    type: null,
    priority: null,
    status: null,
    assigneeId: null,
    endDate: null,
    updatedAt: null,
    ...overrides,
});

const priority = (position: number) => ({
    id: position + 1,
    name: `P${position}`,
    color: '#fff',
    icon: 'Flame',
    position,
});

const ids = (rows: DashboardIssueRow[]) => rows.map((r) => r.id);

describe('sortIssues', () => {
    const rows = [
        row(1, {
            priority: priority(1),
            endDate: '2026-11-20',
            updatedAt: '2026-11-01T10:00:00Z',
        }),
        row(2, {
            priority: priority(0),
            endDate: '2026-11-25',
            updatedAt: '2026-11-03T10:00:00Z',
        }),
        row(3, {
            priority: null,
            endDate: '2026-11-12',
            updatedAt: '2026-11-02T10:00:00Z',
        }),
        row(4, { priority: priority(0), endDate: null, updatedAt: null }),
    ];

    test('by priority: the top of the scale first, none last, then the nearest date', () => {
        expect(ids(sortIssues(rows, 'priority'))).toEqual([2, 4, 1, 3]);
    });

    test('by due date: the nearest first, none last', () => {
        expect(ids(sortIssues(rows, 'due'))).toEqual([3, 1, 2, 4]);
    });

    test('by last update: the newest first, never updated last', () => {
        expect(ids(sortIssues(rows, 'updated'))).toEqual([2, 3, 1, 4]);
    });

    test('does not change the list it was given', () => {
        const before = ids(rows);

        sortIssues(rows, 'due');

        expect(ids(rows)).toEqual(before);
    });
});

describe('filterDeadlines', () => {
    const rows = [
        row(1, { endDate: '2026-11-01', assigneeId: 7 }), // long overdue
        row(2, { endDate: '2026-11-09', assigneeId: 8 }), // yesterday
        row(3, { endDate: '2026-11-10', assigneeId: 7 }), // today
        row(4, { endDate: '2026-11-15', assigneeId: 7 }), // in 5 days
        row(5, { endDate: '2026-11-30', assigneeId: 7 }), // in 20 days
        row(6, { endDate: null, assigneeId: 7 }),
    ];
    const base = {
        scope: 'all' as const,
        range: 14,
        overdue: true,
        limit: 10,
        now: NOW,
    };

    test('keeps what is overdue and what is due inside the range', () => {
        expect(ids(filterDeadlines(rows, base))).toEqual([1, 2, 3, 4]);
    });

    test('leaves the overdue out when asked to', () => {
        expect(ids(filterDeadlines(rows, { ...base, overdue: false }))).toEqual(
            [3, 4],
        );
    });

    test('looks as far ahead as the range says', () => {
        expect(ids(filterDeadlines(rows, { ...base, range: 30 }))).toEqual([
            1, 2, 3, 4, 5,
        ]);
        expect(
            ids(filterDeadlines(rows, { ...base, range: 3, overdue: false })),
        ).toEqual([3]);
    });

    test('keeps only the issues of the user in the mine scope', () => {
        expect(
            ids(filterDeadlines(rows, { ...base, scope: 'mine', userId: 7 })),
        ).toEqual([1, 3, 4]);
        expect(
            ids(filterDeadlines(rows, { ...base, scope: 'mine', userId: 99 })),
        ).toEqual([]);
    });

    test('shows no more than the limit', () => {
        expect(ids(filterDeadlines(rows, { ...base, limit: 2 }))).toEqual([
            1, 2,
        ]);
    });
});

describe('summarizeWeek', () => {
    const trend = [
        { day: 'Mon', count: 4 },
        { day: 'Tue', count: 9 },
        { day: 'Wed', count: 0 },
        { day: 'Thu', count: 2 },
    ];

    test('totals the week, averages it per day and finds the best day', () => {
        expect(summarizeWeek(trend, 'Tue')).toMatchObject({
            total: 15,
            average: 3.8,
            best: { day: 'Tue', count: 9 },
            today: 9,
        });
    });

    test('has no best day in a week without activity', () => {
        expect(summarizeWeek([{ day: 'Mon', count: 0 }], 'Mon')).toMatchObject({
            total: 0,
            average: 0,
            best: null,
            today: 0,
        });
    });

    test('copes with no days at all and with a day that is not in the week', () => {
        expect(summarizeWeek([], 'Mon')).toMatchObject({
            total: 0,
            average: 0,
            best: null,
            today: 0,
        });
        expect(summarizeWeek(trend, 'Sun').today).toBe(0);
    });

    test('keeps the first of two best days', () => {
        expect(
            summarizeWeek([
                { day: 'Mon', count: 5 },
                { day: 'Tue', count: 5 },
            ]).best,
        ).toEqual({ day: 'Mon', count: 5 });
    });
});

describe('groupDeadlines', () => {
    const rows = [
        row(1, { endDate: '2026-11-01' }),
        row(2, { endDate: '2026-11-09' }),
        row(3, { endDate: '2026-11-10' }),
        row(4, { endDate: '2026-11-10' }),
        row(5, { endDate: '2026-11-11' }),
        row(6, { endDate: '2026-11-14' }),
        row(7, { endDate: null }),
    ];

    test('puts everything overdue in one group first, then a group per day', () => {
        const groups = groupDeadlines(rows, NOW);

        expect(groups.map((g) => g.key)).toEqual([
            'overdue',
            '2026-11-10',
            '2026-11-11',
            '2026-11-14',
        ]);
        expect(groups.map((g) => ids(g.rows))).toEqual([
            [1, 2],
            [3, 4],
            [5],
            [6],
        ]);
    });

    test('names the groups the way a person would', () => {
        expect(groupDeadlines(rows, NOW).map((g) => g.label)).toEqual([
            'Overdue',
            'Today',
            'Tomorrow',
            'Sat, 14 Nov',
        ]);
    });

    test('gives each group the tone of its due date', () => {
        expect(groupDeadlines(rows, NOW).map((g) => g.tone)).toEqual([
            'overdue',
            'today',
            'soon',
            'soon',
        ]);
    });

    test('skips an issue without an end date and has no groups for none', () => {
        expect(groupDeadlines([row(7, { endDate: null })], NOW)).toEqual([]);
        expect(groupDeadlines([], NOW)).toEqual([]);
    });
});
