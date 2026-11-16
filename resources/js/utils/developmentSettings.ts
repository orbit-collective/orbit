/**
 * How the Development view shows things, chosen by the person and remembered
 * in this browser. Every value is checked against what is allowed, so a
 * stored setting that no longer exists (or was edited by hand) falls back to
 * the default instead of breaking the view.
 */

export const RANGES = ['7d', '30d', '90d', '180d', '365d', 'all'] as const;
export type DevelopmentRange = (typeof RANGES)[number];

/** The most pull requests read into the view, however far back the range reaches. */
export const PULL_REQUEST_LIMITS = [100, 250, 500, 1000] as const;

/** Rows per page offered by the pagers of the lists. */
export const PAGE_SIZES = [5, 10, 25, 50] as const;

export const ACTIVITY_WEEK_CHOICES = [4, 12, 26, 52] as const;

export const COMMIT_CHOICES = [5, 8, 15, 30] as const;

export type DevelopmentSection =
    | 'stats'
    | 'issues'
    | 'insights'
    | 'branches'
    | 'commits';

export const SECTIONS: readonly DevelopmentSection[] = [
    'stats',
    'issues',
    'insights',
    'branches',
    'commits',
];

export interface DevelopmentSettings {
    /** How far back pull requests are read, by last update. */
    range: DevelopmentRange;
    /** The most pull requests read for that range. */
    pullRequestLimit: number;
    pullRequestsPerPage: number;
    issuesPerPage: number;
    branchesPerPage: number;
    activityWeeks: number;
    commitsShown: number;
    /** A hidden section is not drawn and, which is the point, not requested. */
    sections: Record<DevelopmentSection, boolean>;
}

export const DEFAULT_SETTINGS: DevelopmentSettings = {
    range: '90d',
    pullRequestLimit: 250,
    pullRequestsPerPage: 10,
    issuesPerPage: 5,
    branchesPerPage: 5,
    activityWeeks: 12,
    commitsShown: 8,
    sections: {
        stats: true,
        issues: true,
        insights: true,
        branches: true,
        commits: true,
    },
};

export const SETTINGS_STORAGE_KEY = 'developmentSettings';

const oneOf = <T extends number | string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

/** Whatever was stored (or nothing) as settings that are safe to use. */
export function normalizeSettings(raw: unknown): DevelopmentSettings {
    const stored =
        raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const storedSections =
        stored.sections && typeof stored.sections === 'object'
            ? (stored.sections as Record<string, unknown>)
            : {};

    return {
        range: oneOf(stored.range, RANGES, DEFAULT_SETTINGS.range),
        pullRequestLimit: oneOf(
            stored.pullRequestLimit,
            PULL_REQUEST_LIMITS,
            DEFAULT_SETTINGS.pullRequestLimit as 250,
        ),
        pullRequestsPerPage: oneOf(
            stored.pullRequestsPerPage,
            PAGE_SIZES,
            DEFAULT_SETTINGS.pullRequestsPerPage as 10,
        ),
        issuesPerPage: oneOf(
            stored.issuesPerPage,
            PAGE_SIZES,
            DEFAULT_SETTINGS.issuesPerPage as 5,
        ),
        branchesPerPage: oneOf(
            stored.branchesPerPage,
            PAGE_SIZES,
            DEFAULT_SETTINGS.branchesPerPage as 5,
        ),
        activityWeeks: oneOf(
            stored.activityWeeks,
            ACTIVITY_WEEK_CHOICES,
            DEFAULT_SETTINGS.activityWeeks as 12,
        ),
        commitsShown: oneOf(
            stored.commitsShown,
            COMMIT_CHOICES,
            DEFAULT_SETTINGS.commitsShown as 8,
        ),
        sections: Object.fromEntries(
            SECTIONS.map((section) => [
                section,
                typeof storedSections[section] === 'boolean'
                    ? storedSections[section]
                    : DEFAULT_SETTINGS.sections[section],
            ]),
        ) as DevelopmentSettings['sections'],
    };
}

const DAYS: Record<Exclude<DevelopmentRange, 'all'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '365d': 365,
};

/** The `YYYY-MM-DD` a range starts on (local time), or undefined for "all of it". */
export function sinceFor(
    range: DevelopmentRange,
    now: Date = new Date(),
): string | undefined {
    if (range === 'all') return undefined;

    const start = new Date(now);
    start.setDate(start.getDate() - DAYS[range]);

    const pad = (value: number) => String(value).padStart(2, '0');

    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}
