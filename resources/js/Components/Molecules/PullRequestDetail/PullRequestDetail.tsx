import { Link } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useRef, useState } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import StatusPill from '@/Components/Atoms/StatusPill/StatusPill';
import CiRunList from '@/Components/Molecules/CiRunList/CiRunList';
import CommitItem from '@/Components/Molecules/CommitItem/CommitItem';
import PullRequestMergeForm, {
    MergeOptions,
} from '@/Components/Molecules/PullRequestMergeForm/PullRequestMergeForm';
import { useDevelopmentResource } from '@/hooks/useDevelopmentResource';
import {
    DevelopmentOverview,
    DevelopmentPullRequest,
    DevelopmentPullRequestDetail,
} from '@/types/Development';
import { cn } from '@/utils/cn';
import { mergeableLook, reviewLook } from '@/utils/development';
import { FOCUS_RING } from '@/utils/focusRing';

const COMMITS_SHOWN = 5;

interface PullRequestDetailProps {
    projectId: number;
    repositoryId: number;
    pullRequest: DevelopmentPullRequest;
    abilities: DevelopmentOverview['abilities'];
    githubLinked: boolean;
    /** Bumped after every change, so the detail reads GitHub again. */
    version: number;
    busy: boolean;
    onSetState: (state: 'open' | 'closed') => void;
    /** Merges with the chosen method; resolves true when it worked. */
    onMerge: (options: MergeOptions) => Promise<boolean>;
    onLinkIssue: () => void;
    onUnlinkIssue: (issueId: number) => void;
}

const SECTION =
    'm-0 mb-2 text-[11px] font-semibold tracking-wider text-(--text-gray-color) uppercase';

/**
 * What is behind a pull request row: size of the change, checks, reviews,
 * commits, the Orbit issues linked to it and the actions on it. The reading
 * is its own request (the list is cheap, this is not), made when the row opens.
 */
export default function PullRequestDetail({
    projectId,
    repositoryId,
    pullRequest,
    abilities,
    githubLinked,
    version,
    busy,
    onSetState,
    onMerge,
    onLinkIssue,
    onUnlinkIssue,
}: PullRequestDetailProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const { data, loading, error, reload } =
        useDevelopmentResource<DevelopmentPullRequestDetail>(
            route('projects.development.pull-requests.show', {
                project: projectId,
                number: pullRequest.number,
            }),
            { repository_id: repositoryId },
            t('pull_request_detail.failed'),
        );

    // A change made from here (or elsewhere in the view) reads it again.
    const seenVersion = useRef(version);
    useEffect(() => {
        if (seenVersion.current === version) return;
        seenVersion.current = version;
        reload();
    }, [version, reload]);

    const [confirming, setConfirming] = useState(false);
    const [merging, setMerging] = useState(false);
    const canChange = abilities.manage && githubLinked;
    const closing = pullRequest.state === 'open';
    const canToggle = pullRequest.state !== 'merged';

    if (!data) {
        return error ? (
            <div role="alert" className="flex items-center gap-3 text-xs">
                <span className="text-(--error-color)">{error}</span>
                <button
                    type="button"
                    onClick={reload}
                    className={cn(
                        'cursor-pointer rounded-sm border-none bg-transparent text-(--accent-color) underline',
                        FOCUS_RING,
                    )}
                >
                    {t('pull_request_detail.retry')}
                </button>
            </div>
        ) : (
            <div
                role="status"
                aria-label={t('pull_request_detail.loading')}
                className="space-y-2"
            >
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" index={1} />
                <Skeleton className="h-3 w-1/2" index={2} />
            </div>
        );
    }

    const reviews = data.reviews.filter((review) => review.author);
    const standing = mergeableLook(data.mergeableState);
    const canMerge =
        canChange && pullRequest.state === 'open' && !pullRequest.draft;

    return (
        <div
            className={cn(
                'space-y-4 transition-opacity',
                loading && 'opacity-60',
            )}
            aria-busy={loading}
        >
            <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-xs text-(--text-gray-color)">
                <li className="font-semibold tabular-nums">
                    <span className="text-(--success-color)">
                        +{data.additions}
                    </span>{' '}
                    <span className="text-(--error-color)">
                        −{data.deletions}
                    </span>
                </li>
                <li>
                    {tChoice('pull_request_detail.files', data.changedFiles, {
                        count: data.changedFiles,
                    })}
                </li>
                <li>
                    {tChoice('pull_request_detail.commits', data.commitCount, {
                        count: data.commitCount,
                    })}
                </li>
                <li>
                    {tChoice(
                        'pull_request_detail.comments',
                        data.commentCount,
                        {
                            count: data.commentCount,
                        },
                    )}
                </li>
            </ul>

            <div className="grid gap-5 md:grid-cols-2">
                <section aria-labelledby={`checks-${pullRequest.id}`}>
                    <h5 id={`checks-${pullRequest.id}`} className={SECTION}>
                        {t('pull_request_detail.checks')}
                    </h5>
                    <CiRunList runs={data.ci?.runs ?? []} />

                    <h5 className={cn(SECTION, 'mt-4')}>
                        {t('pull_request_detail.reviews')}
                    </h5>
                    {reviews.length === 0 ? (
                        <p className="text-xs text-(--text-muted-color)">
                            {t('pull_request_detail.no_reviews')}
                        </p>
                    ) : (
                        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                            {reviews.map((review, index) => {
                                const look = reviewLook(review.state);
                                const person = review.author!;

                                return (
                                    <li
                                        key={`${person.login}-${index}`}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        <Avatar
                                            src={person.avatarUrl}
                                            alt={person.login}
                                            initials={person.login
                                                .slice(0, 2)
                                                .toUpperCase()}
                                            size="sm"
                                        />
                                        <span className="min-w-0 flex-1 truncate text-(--text-color)">
                                            {person.login}
                                        </span>
                                        {look && (
                                            <StatusPill
                                                tone={look.tone}
                                                icon={look.icon}
                                            >
                                                {t(look.labelKey)}
                                            </StatusPill>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section aria-labelledby={`commits-${pullRequest.id}`}>
                    <h5 id={`commits-${pullRequest.id}`} className={SECTION}>
                        {t('pull_request_detail.commits_title')}
                    </h5>
                    <ul className="m-0 list-none p-0">
                        {data.commits.slice(0, COMMITS_SHOWN).map((commit) => (
                            <CommitItem key={commit.sha} commit={commit} />
                        ))}
                    </ul>
                    {data.commits.length > COMMITS_SHOWN && (
                        <a
                            href={`${pullRequest.url}/commits`}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                                'mt-1 inline-block rounded-sm text-xs text-(--accent-color) hover:underline',
                                FOCUS_RING,
                            )}
                        >
                            {t('pull_request_detail.more_commits', {
                                count: data.commits.length - COMMITS_SHOWN,
                            })}
                        </a>
                    )}
                </section>
            </div>

            <section aria-labelledby={`issues-${pullRequest.id}`}>
                <h5 id={`issues-${pullRequest.id}`} className={SECTION}>
                    {t('pull_request_detail.issues')}
                </h5>
                <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
                    {pullRequest.issues.map((issue) => (
                        <li
                            key={issue.id}
                            className="flex max-w-full items-center rounded-full border border-(--border-color) bg-(--bg-light-color) pr-1 pl-2.5 text-xs"
                        >
                            <Link
                                href={route('issues.show', {
                                    project: projectId,
                                    issue: issue.id,
                                })}
                                className={cn(
                                    'truncate rounded-sm py-0.5 text-(--text-color) hover:text-(--accent-color)',
                                    FOCUS_RING,
                                )}
                            >
                                #{issue.number} {issue.title}
                            </Link>
                            {canChange && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    aria-label={t(
                                        'pull_request_detail.unlink',
                                        { number: issue.number },
                                    )}
                                    onClick={() => onUnlinkIssue(issue.id)}
                                    className={cn(
                                        'ml-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-(--text-muted-color) hover:text-(--error-color) disabled:cursor-not-allowed disabled:opacity-40',
                                        FOCUS_RING,
                                    )}
                                >
                                    <Icon name="X" size={12} />
                                </button>
                            )}
                        </li>
                    ))}
                    {pullRequest.issues.length === 0 && (
                        <li className="text-xs text-(--text-muted-color)">
                            {t('pull_request_detail.no_issues')}
                        </li>
                    )}
                    {canChange && (
                        <li>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={onLinkIssue}
                                className={cn(
                                    'flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-(--border-color-strong) bg-transparent px-2.5 py-0.5 text-xs text-(--text-gray-color) transition-colors hover:border-(--accent-color) hover:text-(--accent-color) disabled:cursor-not-allowed disabled:opacity-40',
                                    FOCUS_RING,
                                )}
                            >
                                <Icon name="Plus" size={12} />
                                {t('pull_request_detail.link_issue')}
                            </button>
                        </li>
                    )}
                </ul>
            </section>

            <div className="flex flex-wrap items-center gap-2 border-t border-(--border-color) pt-3">
                <a
                    href={pullRequest.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                        'flex items-center gap-1.5 rounded-xs bg-(--bg-light-color) px-3 py-1.5 text-sm font-medium text-(--text-color) hover:brightness-90',
                        FOCUS_RING,
                    )}
                >
                    <Icon name="ExternalLink" size={14} />
                    {t('pull_request_detail.open_on_github')}
                </a>
                {canMerge && (
                    <Button
                        type="button"
                        className="px-3 py-1.5"
                        isDisabled={busy || standing?.blocksMerge === true}
                        aria-expanded={merging}
                        title={
                            standing?.blocksMerge
                                ? t('pull_request_detail.merge_conflicts')
                                : undefined
                        }
                        onClick={() => setMerging((open) => !open)}
                    >
                        <Icon name="GitMerge" size={14} />
                        {t('pull_request_detail.merge')}
                    </Button>
                )}
                {standing && pullRequest.state === 'open' && (
                    <StatusPill tone={standing.tone} icon={standing.icon}>
                        {t(standing.labelKey)}
                    </StatusPill>
                )}
                {canChange && canToggle && (
                    <Button
                        type="button"
                        variant={closing && confirming ? 'danger' : 'default'}
                        isBox={!(closing && confirming)}
                        className="px-3 py-1.5"
                        isDisabled={busy}
                        onBlur={() => setConfirming(false)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') setConfirming(false);
                        }}
                        onClick={() => {
                            if (closing && !confirming) {
                                setConfirming(true);
                                return;
                            }
                            setConfirming(false);
                            onSetState(closing ? 'closed' : 'open');
                        }}
                    >
                        <Icon
                            name={
                                closing
                                    ? 'GitPullRequestClosed'
                                    : 'GitPullRequest'
                            }
                            size={14}
                        />
                        {closing
                            ? confirming
                                ? t('pull_request_detail.confirm_close')
                                : t('pull_request_detail.close')
                            : t('pull_request_detail.reopen')}
                    </Button>
                )}
                {abilities.manage && !githubLinked && (
                    <span className="text-xs text-(--text-muted-color)">
                        {t('pull_request_detail.link_github_account')}
                    </span>
                )}
            </div>
            {canMerge && merging && (
                <PullRequestMergeForm
                    number={pullRequest.number}
                    title={pullRequest.title}
                    busy={busy}
                    onMerge={async (options) => {
                        const merged = await onMerge(options);
                        if (merged) setMerging(false);

                        return merged;
                    }}
                    onCancel={() => setMerging(false)}
                />
            )}
        </div>
    );
}
