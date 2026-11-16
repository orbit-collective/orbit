import { describe, expect, test } from 'vitest';
import {
    DEFAULT_SETTINGS,
    normalizeSettings,
    sinceFor,
} from './developmentSettings';

describe('normalizeSettings', () => {
    test('nothing stored is the defaults', () => {
        expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(normalizeSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
        expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
    });

    test('keeps valid values', () => {
        const settings = normalizeSettings({
            range: '30d',
            pullRequestLimit: 500,
            pullRequestsPerPage: 25,
            issuesPerPage: 25,
            branchesPerPage: 10,
            activityWeeks: 26,
            commitsShown: 15,
            sections: {
                stats: false,
                issues: true,
                insights: true,
                branches: false,
                commits: true,
            },
        });

        expect(settings).toEqual({
            range: '30d',
            pullRequestLimit: 500,
            pullRequestsPerPage: 25,
            issuesPerPage: 25,
            branchesPerPage: 10,
            activityWeeks: 26,
            commitsShown: 15,
            sections: {
                stats: false,
                issues: true,
                insights: true,
                branches: false,
                commits: true,
            },
        });
    });

    test('replaces a value that is not allowed (any more) with the default, field by field', () => {
        const settings = normalizeSettings({
            range: '2y',
            pullRequestLimit: 99999,
            pullRequestsPerPage: 7,
            activityWeeks: 12,
            sections: { stats: 'no', insights: false },
        });

        expect(settings.range).toBe(DEFAULT_SETTINGS.range);
        expect(settings.pullRequestLimit).toBe(
            DEFAULT_SETTINGS.pullRequestLimit,
        );
        expect(settings.pullRequestsPerPage).toBe(
            DEFAULT_SETTINGS.pullRequestsPerPage,
        );
        expect(settings.activityWeeks).toBe(12);
        expect(settings.sections).toEqual({
            stats: true,
            issues: true,
            insights: false,
            branches: true,
            commits: true,
        });
    });
});

describe('sinceFor', () => {
    const now = new Date(2026, 10, 16, 12, 0);

    test('counts the range back from today', () => {
        expect(sinceFor('7d', now)).toBe('2026-11-09');
        expect(sinceFor('30d', now)).toBe('2026-10-17');
        expect(sinceFor('365d', now)).toBe('2025-11-16');
    });

    test('"all" has no start', () => {
        expect(sinceFor('all', now)).toBeUndefined();
    });
});
