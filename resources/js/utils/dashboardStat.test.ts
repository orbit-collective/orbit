import { describe, expect, test } from 'vitest';
import { makeIssueStats } from '@/tests/issueStats';
import { statFigures, statTitle } from './dashboardStat';

const stats = makeIssueStats({
    high: 2,
    todo: 3,
    inProgress: 1,
    done: 4,
    overdue: 2,
    dueSoon: 5,
    assigned: 3,
});

describe('statFigures', () => {
    test('counts the projects, which are not a part of anything', () => {
        expect(statFigures('projects', undefined, stats, 4)).toMatchObject({
            title: 'Active Projects',
            value: 4,
            whole: null,
            color: 'accent',
        });
    });

    test.each([
        ['open', 'Open Issues', 4],
        ['todo', 'To Do', 3],
        ['in_progress', 'In Progress', 1],
        ['done', 'Done Issues', 4],
        ['all', 'All Issues', 8],
    ])('the open issues can count %s', (count, title, value) => {
        expect(statFigures('open_issues', count, stats, 1)).toMatchObject({
            title,
            value,
            whole: 8,
            color: 'info',
        });
    });

    test('the issue metrics are a part of every issue or of the open ones', () => {
        expect(statFigures('critical', null, stats, 1)).toMatchObject({
            value: 2,
            whole: 8,
            color: 'error',
        });
        expect(statFigures('resolution', null, stats, 1)).toMatchObject({
            value: 4,
            whole: 8,
            color: 'success',
        });
        expect(statFigures('overdue', null, stats, 1)).toMatchObject({
            value: 2,
            whole: 4,
        });
        expect(statFigures('assigned', null, stats, 1)).toMatchObject({
            value: 3,
            whole: 4,
        });
        expect(statFigures('due_soon', null, stats, 1)).toMatchObject({
            value: 5,
            whole: 4,
            color: 'warning',
        });
    });

    test('an unknown metric or count falls back to the open issues', () => {
        expect(statFigures('bogus', 'nope', stats, 1)).toMatchObject({
            title: 'Open Issues',
            value: 4,
        });
    });
});

describe('statTitle', () => {
    test('names a metric, and falls back to the open issues', () => {
        expect(statTitle('overdue')).toBe('Overdue Issues');
        expect(statTitle('projects')).toBe('Active Projects');
        expect(statTitle(undefined)).toBe('Open Issues');
    });
});
