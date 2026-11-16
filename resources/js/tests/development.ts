import {
    CiSummary,
    DevelopmentBranch,
    DevelopmentCommit,
    DevelopmentInsights,
    DevelopmentOverview,
    DevelopmentPullRequest,
    DevelopmentPullRequestDetail,
} from '@/types/Development';

/** Builders for the Development view's data, shared by tests and stories. */

const daysAgo = (days: number) =>
    new Date(Date.now() - days * 86_400_000).toISOString();

export const buildCi = (overrides: Partial<CiSummary> = {}): CiSummary => ({
    state: 'passed',
    total: 2,
    passed: 2,
    failed: 0,
    pending: 0,
    runs: [
        {
            name: 'build',
            state: 'passed',
            url: 'https://github.com/orbit-collective/orbit/actions/runs/1',
            durationSeconds: 95,
        },
        { name: 'lint', state: 'passed', url: null, durationSeconds: 12 },
    ],
    ...overrides,
});

export const buildPullRequest = (
    overrides: Partial<DevelopmentPullRequest> = {},
): DevelopmentPullRequest => ({
    id: 4580098240,
    number: 7,
    title: 'Add login redirect',
    state: 'open',
    draft: false,
    url: 'https://github.com/orbit-collective/orbit/pull/7',
    body: 'Adds the redirect.',
    author: { login: 'ada', avatarUrl: 'https://avatars.test/ada.png' },
    headBranch: 'feat/login',
    headSha: 'abc1234def',
    baseBranch: 'master',
    labels: [],
    requestedReviewers: [],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    closedAt: null,
    mergedAt: null,
    ci: buildCi(),
    issues: [],
    ...overrides,
});

export const buildCommit = (
    overrides: Partial<DevelopmentCommit> = {},
): DevelopmentCommit => ({
    sha: 'deadbeefcafe',
    message: 'fix: keep the redirect target',
    url: 'https://github.com/orbit-collective/orbit/commit/deadbeefcafe',
    authorName: 'Ada Lovelace',
    author: { login: 'ada', avatarUrl: 'https://avatars.test/ada.png' },
    committedAt: daysAgo(2),
    ...overrides,
});

export const buildPullRequestDetail = (
    overrides: Partial<DevelopmentPullRequestDetail> = {},
): DevelopmentPullRequestDetail => ({
    ...buildPullRequest(),
    additions: 120,
    deletions: 14,
    changedFiles: 6,
    commitCount: 2,
    commentCount: 3,
    mergeableState: 'clean',
    reviewState: 'approved',
    reviews: [
        {
            author: { login: 'bob', avatarUrl: 'https://avatars.test/bob.png' },
            state: 'approved',
            submittedAt: daysAgo(1),
        },
    ],
    commits: [
        buildCommit(),
        buildCommit({ sha: 'f00dbabe1234', message: 'test: cover it' }),
    ],
    ...overrides,
});

export const buildBranch = (
    overrides: Partial<DevelopmentBranch> = {},
): DevelopmentBranch => ({
    name: 'master',
    sha: '1234567890ab',
    protected: true,
    isDefault: true,
    ...overrides,
});

export const buildInsights = (
    overrides: Partial<DevelopmentInsights> = {},
): DevelopmentInsights => ({
    repository: {
        fullName: 'orbit-collective/orbit',
        description: 'Issue tracker',
        url: 'https://github.com/orbit-collective/orbit',
        private: false,
        defaultBranch: 'master',
        stars: 42,
        forks: 7,
        pushedAt: daysAgo(1),
    },
    contributors: [
        {
            login: 'ada',
            avatarUrl: 'https://avatars.test/ada.png',
            contributions: 120,
            url: 'https://github.com/ada',
        },
        {
            login: 'bob',
            avatarUrl: 'https://avatars.test/bob.png',
            contributions: 30,
            url: 'https://github.com/bob',
        },
    ],
    languages: [
        { name: 'TypeScript', bytes: 600 },
        { name: 'PHP', bytes: 400 },
    ],
    commitActivity: Array.from({ length: 12 }, (_, index) => ({
        // One entry per week, oldest first, so the dates (the chart's keys) are unique.
        weekStart: new Date(Date.UTC(2026, 0, 5 + index * 7))
            .toISOString()
            .slice(0, 10),
        total: index + 1,
    })),
    ...overrides,
});

export const buildOverview = (
    overrides: Partial<DevelopmentOverview> = {},
): DevelopmentOverview => ({
    connected: true,
    repositories: [{ id: 1, owner: 'orbit-collective', name: 'orbit' }],
    abilities: { manage: true, createBranch: true },
    githubLinked: true,
    canConfigure: true,
    ...overrides,
});
