import type { icons } from 'lucide-react';
import {
    CiState,
    DevelopmentInsights,
    DevelopmentPullRequest,
    PullRequestState,
    ReviewState,
} from '@/types/Development';

export type PillTone =
    | 'success'
    | 'danger'
    | 'warning'
    | 'accent'
    | 'info'
    | 'neutral';

export interface PillLook {
    tone: PillTone;
    icon: keyof typeof icons;
    /** Key of `development_status.*`. */
    labelKey: string;
}

/** How a pull request's own state is drawn: open is alive, merged is done, closed is spent. */
export function pullRequestLook(
    pullRequest: Pick<DevelopmentPullRequest, 'state' | 'draft'>,
): PillLook {
    if (pullRequest.state === 'merged') {
        return {
            tone: 'accent',
            icon: 'GitMerge',
            labelKey: 'development_status.pull_request.merged',
        };
    }

    if (pullRequest.state === 'closed') {
        return {
            tone: 'danger',
            icon: 'GitPullRequestClosed',
            labelKey: 'development_status.pull_request.closed',
        };
    }

    return pullRequest.draft
        ? {
              tone: 'neutral',
              icon: 'GitPullRequest',
              labelKey: 'development_status.pull_request.draft',
          }
        : {
              tone: 'success',
              icon: 'GitPullRequest',
              labelKey: 'development_status.pull_request.open',
          };
}

export function ciLook(state: CiState): PillLook {
    switch (state) {
        case 'passed':
            return {
                tone: 'success',
                icon: 'CircleCheck',
                labelKey: 'development_status.ci.passed',
            };
        case 'failed':
            return {
                tone: 'danger',
                icon: 'CircleX',
                labelKey: 'development_status.ci.failed',
            };
        case 'pending':
            return {
                tone: 'warning',
                icon: 'LoaderCircle',
                labelKey: 'development_status.ci.pending',
            };
        default:
            return {
                tone: 'neutral',
                icon: 'Minus',
                labelKey: 'development_status.ci.none',
            };
    }
}

/** `none` has no pill at all: nobody reviewed yet is not news. */
export function reviewLook(state: ReviewState): PillLook | null {
    switch (state) {
        case 'approved':
            return {
                tone: 'success',
                icon: 'Check',
                labelKey: 'development_status.review.approved',
            };
        case 'changes_requested':
            return {
                tone: 'danger',
                icon: 'TriangleExclamationPoint',
                labelKey: 'development_status.review.changes_requested',
            };
        case 'commented':
            return {
                tone: 'info',
                icon: 'MessageSquare',
                labelKey: 'development_status.review.commented',
            };
        default:
            return null;
    }
}

/** A run's length as `1m 05s` / `42s`, or null when GitHub did not say. */
export function formatDuration(seconds: number | null): string | null {
    if (seconds === null) return null;
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, '0');

    return `${minutes}m ${rest}s`;
}

/** The first seven characters of a commit sha, the way git shows it. */
export const shortSha = (sha: string): string => sha.slice(0, 7);

/** A repository as `owner/name`. */
export const repositoryLabel = (repository: {
    owner: string;
    name: string;
}): string => `${repository.owner}/${repository.name}`;

/** Commits of the last `weeks` weeks of the weekly activity series. */
export function recentCommitCount(
    activity: DevelopmentInsights['commitActivity'],
    weeks: number,
): number {
    return activity.slice(-weeks).reduce((sum, week) => sum + week.total, 0);
}

export interface LanguageShare {
    name: string;
    percent: number;
    color: string;
}

/** GitHub's own colours for the languages people actually meet; anything else gets a neutral one. */
const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    PHP: '#4f5d95',
    Python: '#3572a5',
    CSS: '#663399',
    HTML: '#e34c26',
    Blade: '#f7523f',
    Shell: '#89e051',
    Dockerfile: '#384d54',
    Go: '#00add8',
    Rust: '#dea584',
    Java: '#b07219',
    Ruby: '#701516',
    SCSS: '#c6538c',
    Vue: '#41b883',
};

const FALLBACK_COLORS = ['#8844da', '#2196f3', '#ff9800', '#4caf50', '#e91e63'];

/**
 * The languages as shares of the whole, biggest first. Past `limit` the rest
 * collapse into one `Other` share, so a legend never runs away.
 */
export function languageShares(
    languages: DevelopmentInsights['languages'],
    limit = 5,
    otherLabel = 'Other',
): LanguageShare[] {
    const total = languages.reduce((sum, language) => sum + language.bytes, 0);

    if (total === 0) return [];

    const sorted = [...languages].sort((a, b) => b.bytes - a.bytes);
    const shown = sorted.slice(0, limit);
    const rest = sorted.slice(limit).reduce((sum, item) => sum + item.bytes, 0);
    const share = (bytes: number) => Math.round((bytes / total) * 1000) / 10;

    return [
        ...shown.map((language, index) => ({
            name: language.name,
            percent: share(language.bytes),
            color:
                LANGUAGE_COLORS[language.name] ??
                FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        })),
        ...(rest > 0
            ? [{ name: otherLabel, percent: share(rest), color: '#757575' }]
            : []),
    ];
}

/** The share of CI results that passed among open pull requests that have any, or null without data. */
export function ciPassRate(
    pullRequests: Pick<DevelopmentPullRequest, 'state' | 'ci'>[],
): number | null {
    const decided = pullRequests.filter(
        (pullRequest) =>
            pullRequest.state === 'open' &&
            (pullRequest.ci?.state === 'passed' ||
                pullRequest.ci?.state === 'failed'),
    );

    if (decided.length === 0) return null;

    const passed = decided.filter(
        (pullRequest) => pullRequest.ci?.state === 'passed',
    );

    return Math.round((passed.length / decided.length) * 100);
}

/** `owner/name` + a branch name: the git-flavoured default for a branch started from an issue. */
export function branchNameFor(issueNumber: number, title: string): string {
    const slug = title
        .toLowerCase()
        // ł has no decomposition, so it would otherwise read as a separator.
        .replace(/ł/g, 'l')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${issueNumber}-${slug}`.slice(0, 60).replace(/-+$/, '');
}

/** Whether a pull request state is one a person can still act on (close). */
export const isOpen = (state: PullRequestState): boolean => state === 'open';
