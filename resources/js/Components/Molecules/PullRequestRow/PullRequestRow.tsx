import { Link } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { ReactNode, useId } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import StatusPill from '@/Components/Atoms/StatusPill/StatusPill';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import { DevelopmentPullRequest } from '@/types/Development';
import { cn } from '@/utils/cn';
import { ciLook, pullRequestLook } from '@/utils/development';
import { FOCUS_RING, FOCUS_RING_INSET } from '@/utils/focusRing';
import { formatTimeAgo } from '@/utils/time';

interface PullRequestRowProps {
    projectId: number;
    pullRequest: DevelopmentPullRequest;
    expanded: boolean;
    /** The checks have not arrived yet: a placeholder stands where their pill will be. */
    ciPending?: boolean;
    onToggle: () => void;
    /** The detail; only mounted while the row is open, so it fetches nothing folded. */
    children: ReactNode;
}

const STATE_TEXT = {
    success: 'text-(--success-color)',
    danger: 'text-(--error-color)',
    warning: 'text-(--warning-color)',
    accent: 'text-(--accent-color)',
    info: 'text-(--info-color)',
    neutral: 'text-(--text-muted-color)',
} as const;

/**
 * One pull request of the Development view. The title line is a single button
 * that folds the detail open (`aria-expanded`); the pills and the linked-issue
 * chips sit beside it, never inside it, so every control stays its own tab stop.
 */
export default function PullRequestRow({
    projectId,
    pullRequest,
    expanded,
    ciPending = false,
    onToggle,
    children,
}: PullRequestRowProps) {
    const { t } = useLaravelReactI18n();
    const bodyId = useId();
    const state = pullRequestLook(pullRequest);
    const ci = pullRequest.ci ? ciLook(pullRequest.ci.state) : null;
    const author = pullRequest.author;

    return (
        <article
            className={cn(
                'overflow-hidden rounded-xl border bg-(--surface-color) transition-colors',
                expanded
                    ? 'border-(--border-color-strong)'
                    : 'border-(--border-color) hover:border-(--border-color-strong)',
            )}
        >
            <h4 className="m-0 font-normal">
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={bodyId}
                    onClick={onToggle}
                    className={cn(
                        'flex w-full cursor-pointer items-start gap-3 border-none bg-transparent p-3 text-left',
                        FOCUS_RING_INSET,
                    )}
                >
                    <Icon
                        name={state.icon}
                        size={18}
                        className={cn(
                            'mt-0.5 shrink-0',
                            STATE_TEXT[state.tone],
                        )}
                    />
                    <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-sm font-semibold wrap-break-word text-(--text-color)">
                                {pullRequest.title}
                            </span>
                            <span className="text-xs text-(--text-muted-color)">
                                #{pullRequest.number}
                            </span>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-gray-color)">
                            {author && (
                                <span className="flex items-center gap-1.5">
                                    <Avatar
                                        src={author.avatarUrl}
                                        alt={author.login}
                                        initials={author.login
                                            .slice(0, 2)
                                            .toUpperCase()}
                                        size="sm"
                                    />
                                    {author.login}
                                </span>
                            )}
                            <span>
                                {t('pull_request_row.updated', {
                                    time: formatTimeAgo(
                                        pullRequest.updatedAt,
                                        t,
                                    ),
                                })}
                            </span>
                            <span className="flex min-w-0 items-center gap-1">
                                <code className="max-w-40 truncate rounded-sm bg-(--bg-light-color) px-1.5 py-0.5 text-[11px]">
                                    {pullRequest.headBranch}
                                </code>
                                <Icon name="ArrowRight" size={11} />
                                <code className="max-w-40 truncate rounded-sm bg-(--bg-light-color) px-1.5 py-0.5 text-[11px]">
                                    {pullRequest.baseBranch}
                                </code>
                            </span>
                        </span>
                    </span>
                    <Icon
                        name="ChevronDown"
                        size={16}
                        className={cn(
                            'mt-1 shrink-0 text-(--text-muted-color) transition-transform duration-300',
                            !expanded && '-rotate-90',
                        )}
                    />
                </button>
            </h4>

            <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pl-10">
                <StatusPill tone={state.tone} icon={state.icon}>
                    {t(state.labelKey)}
                </StatusPill>
                {!ci && ciPending && (
                    <Skeleton className="h-5 w-24 rounded-full" />
                )}
                {ci && pullRequest.ci && (
                    <StatusPill
                        tone={ci.tone}
                        icon={ci.icon}
                        spinning={pullRequest.ci.state === 'pending'}
                    >
                        {t(ci.labelKey)}
                    </StatusPill>
                )}
                {pullRequest.issues.map((issue) => (
                    <Link
                        key={issue.id}
                        href={route('issues.show', {
                            project: projectId,
                            issue: issue.id,
                        })}
                        title={issue.title}
                        className={cn(
                            'inline-flex max-w-56 items-center gap-1 rounded-full border border-(--border-color) bg-(--bg-light-color) px-2 py-0.5 text-[11px] font-medium text-(--text-color) transition-colors hover:border-(--accent-color)',
                            FOCUS_RING,
                        )}
                    >
                        <Icon
                            name="Link2"
                            size={11}
                            className="shrink-0 text-(--accent-color)"
                        />
                        <span className="truncate">
                            #{issue.number} {issue.title}
                        </span>
                    </Link>
                ))}
            </div>

            <Collapse id={bodyId} open={expanded} unmountWhenClosed>
                <div className="border-t border-(--border-color) p-3 pl-10">
                    {children}
                </div>
            </Collapse>
        </article>
    );
}
