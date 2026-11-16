import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import SegmentedControl from '@/Components/Atoms/SegmentedControl/SegmentedControl';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import PullRequestDetail from '@/Components/Molecules/PullRequestDetail/PullRequestDetail';
import PullRequestRow from '@/Components/Molecules/PullRequestRow/PullRequestRow';
import LinkIssueModal from '@/Components/Organisms/LinkIssueModal/LinkIssueModal';
import { useStoredChoice } from '@/hooks/useStoredChoice';
import {
    DevelopmentOverview,
    DevelopmentPullRequest,
} from '@/types/Development';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

type Segment = 'open' | 'merged' | 'closed' | 'all';

const SEGMENTS: readonly Segment[] = ['open', 'merged', 'closed', 'all'];

/** A segment is its state's own icon (the word is its tooltip and accessible name). */
const SEGMENT_ICONS = {
    open: 'GitPullRequest',
    merged: 'GitMerge',
    closed: 'GitPullRequestClosed',
    all: 'List',
} as const;

interface PullRequestsPanelProps {
    projectId: number;
    repositoryId: number;
    repositoryUrl: string;
    /** `null` until the first answer. */
    pullRequests: DevelopmentPullRequest[] | null;
    loading: boolean;
    /** Later pages of the range are still being read behind the ones shown. */
    loadingMore?: boolean;
    /** The range holds more than the limit allows, so what is shown is the newest of it. */
    capped?: boolean;
    /** How many were read at most, for the note when capped. */
    limit?: number;
    /** The time range in words ("Last 90 days"), shown under the title. */
    rangeLabel?: string;
    /** Rows per page, and what to do when the person picks another. */
    perPage: number;
    onPerPageChange: (perPage: number) => void;
    perPageOptions: number[];
    /** Shas of open pull requests whose checks have not arrived yet. */
    ciPending?: Set<string>;
    /** The open pull requests on the page being shown: the ones whose checks are worth reading now. */
    onVisibleShas?: (shas: string[]) => void;
    error: string | null;
    onRetry: () => void;
    abilities: DevelopmentOverview['abilities'];
    githubLinked: boolean;
    /** Bumped after every change so open details read GitHub again. */
    version: number;
    busy: boolean;
    onSetState: (number: number, state: 'open' | 'closed') => void;
    onLinkIssue: (number: number, issueId: number) => Promise<boolean>;
    onUnlinkIssue: (number: number, issueId: number) => void;
    className?: string;
}

const matches = (pullRequest: DevelopmentPullRequest, segment: Segment) =>
    segment === 'all' || pullRequest.state === segment;

/**
 * The pull requests of the repository: a filter (open, merged, closed, all)
 * over one list read once, rows that fold open into a detail with checks,
 * reviews, commits and the Orbit issues linked to the pull request. One row
 * open at a time keeps the panel from growing out of reach.
 */
export default function PullRequestsPanel({
    projectId,
    repositoryId,
    repositoryUrl,
    pullRequests,
    loading,
    loadingMore = false,
    capped = false,
    limit,
    rangeLabel,
    perPage,
    onPerPageChange,
    perPageOptions,
    ciPending,
    onVisibleShas,
    error,
    onRetry,
    abilities,
    githubLinked,
    version,
    busy,
    onSetState,
    onLinkIssue,
    onUnlinkIssue,
    className,
}: PullRequestsPanelProps) {
    const { t } = useLaravelReactI18n();
    const [segment, setSegment] = useStoredChoice<Segment>(
        'developmentPullRequestSegment',
        'open',
        SEGMENTS,
    );
    const [expanded, setExpanded] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [linking, setLinking] = useState<DevelopmentPullRequest | null>(null);

    const counts = useMemo(
        () =>
            Object.fromEntries(
                SEGMENTS.map((key) => [
                    key,
                    (pullRequests ?? []).filter((pr) => matches(pr, key))
                        .length,
                ]),
            ) as Record<Segment, number>,
        [pullRequests],
    );
    const filtered = (pullRequests ?? []).filter((pr) => matches(pr, segment));
    // A reload can shrink the list under the page being shown.
    const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
    const current = Math.min(page, lastPage);
    const visible = filtered.slice((current - 1) * perPage, current * perPage);
    const visibleShas = visible
        .filter((pr) => pr.state === 'open')
        .map((pr) => pr.headSha)
        .join(',');

    // Tells the view which checks are worth reading: the ones on screen.
    useEffect(() => {
        onVisibleShas?.(visibleShas === '' ? [] : visibleShas.split(','));
    }, [visibleShas, onVisibleShas]);
    // The open row is found again by number, so it follows its pull request
    // when a reload reorders the list; the modal likewise sees fresh issues.
    const linkingNow =
        linking &&
        (pullRequests?.find((pr) => pr.number === linking.number) ?? linking);

    return (
        <section
            aria-labelledby="development-pull-requests"
            className={cn(
                'rounded-2xl border border-(--border-color) bg-(--surface-color) p-4 sm:p-5',
                className,
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div id="development-pull-requests">
                    <CardHeader
                        icon="GitPullRequest"
                        title={t('pull_requests_panel.title')}
                        description={rangeLabel}
                    />
                </div>
                <SegmentedControl<Segment>
                    label={t('pull_requests_panel.filter')}
                    value={segment}
                    onChange={(next) => {
                        setSegment(next);
                        setExpanded(null);
                        setPage(1);
                    }}
                    iconOnly
                    options={SEGMENTS.map((key) => ({
                        value: key,
                        label: t(`pull_requests_panel.segments.${key}`),
                        icon: SEGMENT_ICONS[key],
                        count: pullRequests ? counts[key] : undefined,
                    }))}
                />
            </div>

            <div
                className="mt-4 flex flex-col gap-2"
                aria-busy={loading}
                aria-live="polite"
            >
                {error && !pullRequests ? (
                    <div
                        role="alert"
                        className="flex flex-col items-center gap-2 py-10 text-center"
                    >
                        <Icon
                            name="TriangleExclamationPoint"
                            size={22}
                            className="text-(--error-color)"
                        />
                        <p className="m-0 text-sm text-(--text-gray-color)">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className={cn(
                                'cursor-pointer rounded-sm border-none bg-transparent text-sm text-(--accent-color) underline',
                                FOCUS_RING,
                            )}
                        >
                            {t('pull_requests_panel.retry')}
                        </button>
                    </div>
                ) : !pullRequests ? (
                    <div
                        role="status"
                        aria-label={t('pull_requests_panel.loading')}
                    >
                        {[0, 1, 2].map((index) => (
                            <Skeleton
                                key={index}
                                index={index}
                                className="mb-2 h-[72px] w-full rounded-xl"
                            />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Icon
                            name="GitPullRequest"
                            size={22}
                            className="text-(--text-muted-color)"
                        />
                        <p className="m-0 text-sm text-(--text-gray-color)">
                            {t(`pull_requests_panel.empty.${segment}`)}
                        </p>
                    </div>
                ) : (
                    visible.map((pullRequest, index) => (
                        <RowReveal key={pullRequest.number} index={index}>
                            <PullRequestRow
                                projectId={projectId}
                                pullRequest={pullRequest}
                                ciPending={
                                    pullRequest.state === 'open' &&
                                    ciPending?.has(pullRequest.headSha)
                                }
                                expanded={expanded === pullRequest.number}
                                onToggle={() =>
                                    setExpanded((current) =>
                                        current === pullRequest.number
                                            ? null
                                            : pullRequest.number,
                                    )
                                }
                            >
                                <PullRequestDetail
                                    projectId={projectId}
                                    repositoryId={repositoryId}
                                    pullRequest={pullRequest}
                                    abilities={abilities}
                                    githubLinked={githubLinked}
                                    version={version}
                                    busy={busy}
                                    onSetState={(state) =>
                                        onSetState(pullRequest.number, state)
                                    }
                                    onLinkIssue={() => setLinking(pullRequest)}
                                    onUnlinkIssue={(issueId) =>
                                        onUnlinkIssue(
                                            pullRequest.number,
                                            issueId,
                                        )
                                    }
                                />
                            </PullRequestRow>
                        </RowReveal>
                    ))
                )}
            </div>

            {pullRequests && (
                <Pagination
                    variant="compact"
                    total={filtered.length}
                    page={current}
                    perPage={perPage}
                    perPageOptions={perPageOptions}
                    onPageChange={(next) => {
                        setPage(next);
                        setExpanded(null);
                    }}
                    onPerPageChange={(size) => {
                        onPerPageChange(size);
                        setPage(1);
                        setExpanded(null);
                    }}
                />
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--text-muted-color)">
                {loadingMore && (
                    <span role="status" className="flex items-center gap-1.5">
                        <Icon
                            name="LoaderCircle"
                            size={12}
                            className="animate-spin motion-reduce:animate-none"
                        />
                        {t('pull_requests_panel.loading_more')}
                    </span>
                )}
                {capped && (
                    <span>
                        {t('pull_requests_panel.capped', {
                            count: limit ?? pullRequests?.length ?? 0,
                        })}
                    </span>
                )}
                {pullRequests && (capped || pullRequests.length === 0) && (
                    <a
                        href={`${repositoryUrl}/pulls`}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                            'inline-flex items-center gap-1 rounded-sm text-(--accent-color) hover:underline',
                            FOCUS_RING,
                        )}
                    >
                        {t('pull_requests_panel.more')}
                        <Icon name="ExternalLink" size={12} />
                    </a>
                )}
            </div>

            {linkingNow && (
                <LinkIssueModal
                    projectId={projectId}
                    pullRequestNumber={linkingNow.number}
                    linked={linkingNow.issues}
                    busy={busy}
                    onLink={(issueId) =>
                        onLinkIssue(linkingNow.number, issueId)
                    }
                    onClose={() => setLinking(null)}
                />
            )}
        </section>
    );
}
