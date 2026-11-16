import { describe, expect, test } from 'vitest';
import { buildPullRequest } from '@/tests/development';
import {
    branchNameFor,
    ciLook,
    ciPassRate,
    formatDuration,
    isOpen,
    languageShares,
    mergeableLook,
    pullRequestLook,
    recentCommitCount,
    repositoryLabel,
    reviewLook,
    shortSha,
} from './development';

describe('pullRequestLook', () => {
    test.each([
        [
            { state: 'open', draft: false },
            'success',
            'development_status.pull_request.open',
        ],
        [
            { state: 'open', draft: true },
            'neutral',
            'development_status.pull_request.draft',
        ],
        [
            { state: 'merged', draft: false },
            'accent',
            'development_status.pull_request.merged',
        ],
        [
            { state: 'closed', draft: false },
            'danger',
            'development_status.pull_request.closed',
        ],
    ] as const)('%j is %s', (pullRequest, tone, labelKey) => {
        expect(pullRequestLook(pullRequest)).toMatchObject({ tone, labelKey });
    });
});

describe('ciLook and reviewLook', () => {
    test('every CI state has a look', () => {
        expect(ciLook('passed').tone).toBe('success');
        expect(ciLook('failed').tone).toBe('danger');
        expect(ciLook('pending').tone).toBe('warning');
        expect(ciLook('none').tone).toBe('neutral');
    });

    test('a review has a pill unless nobody reviewed', () => {
        expect(reviewLook('approved')?.tone).toBe('success');
        expect(reviewLook('changes_requested')?.tone).toBe('danger');
        expect(reviewLook('commented')?.tone).toBe('info');
        expect(reviewLook('none')).toBeNull();
    });
});

describe('small formatters', () => {
    test('formatDuration', () => {
        expect(formatDuration(null)).toBeNull();
        expect(formatDuration(42)).toBe('42s');
        expect(formatDuration(65)).toBe('1m 05s');
        expect(formatDuration(600)).toBe('10m 00s');
    });

    test('shortSha, repositoryLabel and isOpen', () => {
        expect(shortSha('deadbeefcafe')).toBe('deadbee');
        expect(repositoryLabel({ owner: 'o', name: 'r' })).toBe('o/r');
        expect(isOpen('open')).toBe(true);
        expect(isOpen('merged')).toBe(false);
    });
});

describe('recentCommitCount', () => {
    test('sums the last weeks only', () => {
        const activity = [1, 2, 3, 4].map((total, index) => ({
            weekStart: `2026-01-0${index + 1}`,
            total,
        }));

        expect(recentCommitCount(activity, 2)).toBe(7);
        expect(recentCommitCount(activity, 10)).toBe(10);
        expect(recentCommitCount([], 4)).toBe(0);
    });
});

describe('languageShares', () => {
    test('is empty without bytes', () => {
        expect(languageShares([])).toEqual([]);
        expect(languageShares([{ name: 'PHP', bytes: 0 }])).toEqual([]);
    });

    test('orders by size and uses known colours', () => {
        const shares = languageShares([
            { name: 'PHP', bytes: 250 },
            { name: 'TypeScript', bytes: 750 },
        ]);

        expect(shares.map((share) => share.name)).toEqual([
            'TypeScript',
            'PHP',
        ]);
        expect(shares.map((share) => share.percent)).toEqual([75, 25]);
        expect(shares[0].color).toBe('#3178c6');
    });

    test('folds the tail into Other and falls back to a palette colour', () => {
        const languages = Array.from({ length: 7 }, (_, index) => ({
            name: `Lang${index}`,
            bytes: 100 - index,
        }));
        const shares = languageShares(languages, 5, 'Rest');

        expect(shares).toHaveLength(6);
        expect(shares[5]).toMatchObject({ name: 'Rest', color: '#757575' });
        expect(shares[0].color).toMatch(/^#/);
    });
});

describe('ciPassRate', () => {
    test('is null without decided open pull requests', () => {
        expect(ciPassRate([])).toBeNull();
        expect(
            ciPassRate([
                buildPullRequest({ state: 'merged' }),
                buildPullRequest({ ci: null }),
            ]),
        ).toBeNull();
    });

    test('counts passed against failed of open pull requests', () => {
        const failed = buildPullRequest({
            ci: {
                state: 'failed',
                total: 1,
                passed: 0,
                failed: 1,
                pending: 0,
                runs: [],
            },
        });
        const pending = buildPullRequest({
            ci: {
                state: 'pending',
                total: 1,
                passed: 0,
                failed: 0,
                pending: 1,
                runs: [],
            },
        });

        expect(
            ciPassRate([
                buildPullRequest(),
                buildPullRequest(),
                failed,
                pending,
            ]),
        ).toBe(67);
    });
});

describe('branchNameFor', () => {
    test('slugifies the title behind the issue number', () => {
        expect(branchNameFor(12, 'Fix: the Login   redirect!')).toBe(
            '12-fix-the-login-redirect',
        );
    });

    test('drops accents and trims to a safe length', () => {
        expect(branchNameFor(3, 'Żółć')).toBe('3-zolc');
        expect(branchNameFor(1, 'a'.repeat(100)).length).toBeLessThanOrEqual(
            60,
        );
        expect(branchNameFor(1, '!!!')).toBe('1');
    });
});

describe('mergeableLook', () => {
    test('only conflicts rule merging out', () => {
        expect(mergeableLook('clean')).toMatchObject({
            tone: 'success',
            blocksMerge: false,
        });
        expect(mergeableLook('unstable')).toMatchObject({
            tone: 'warning',
            blocksMerge: false,
        });
        expect(mergeableLook('behind')).toMatchObject({
            tone: 'warning',
            blocksMerge: false,
        });
        expect(mergeableLook('blocked')).toMatchObject({
            tone: 'warning',
            blocksMerge: false,
        });
        expect(mergeableLook('dirty')).toMatchObject({
            tone: 'danger',
            blocksMerge: true,
        });
    });

    test('an unknown or missing state has no pill', () => {
        expect(mergeableLook(null)).toBeNull();
        expect(mergeableLook('unknown')).toBeNull();
    });
});
