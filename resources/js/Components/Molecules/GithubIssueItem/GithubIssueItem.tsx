import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import { DevelopmentGithubIssue } from '@/types/Development';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { formatTimeAgo } from '@/utils/time';

interface GithubIssueItemProps {
    issue: DevelopmentGithubIssue;
    /** The branch the button would create, shown as its tooltip. Null hides the button. */
    branchName: string | null;
    /** A branch was created from this issue in this visit. */
    branchCreated: boolean;
    /** The branch is being created right now. */
    creating: boolean;
    /** Another write is running, so none may start. */
    busy: boolean;
    onCreateBranch: () => void;
}

/** GitHub's label colours are bare hex; anything else is drawn neutral instead of trusted into a style. */
const labelColor = (color: string) =>
    /^[0-9a-fA-F]{6}$/.test(color) ? `#${color}` : '#757575';

/**
 * One GitHub issue: its state, the title (a link to GitHub), labels, who
 * opened it and how lively it is, and a one-click button that starts a branch
 * named after it, so the work can begin without typing a name.
 */
export default function GithubIssueItem({
    issue,
    branchName,
    branchCreated,
    creating,
    busy,
    onCreateBranch,
}: GithubIssueItemProps) {
    const { t } = useLaravelReactI18n();
    const open = issue.state === 'open';

    return (
        <li className="flex items-start gap-3 py-2.5">
            <Icon
                name={open ? 'CircleDot' : 'CircleCheck'}
                size={16}
                className={cn(
                    'mt-0.5 shrink-0',
                    open ? 'text-(--success-color)' : 'text-(--accent-color)',
                )}
            />
            <span className="sr-only">
                {t(`github_issue_item.state.${issue.state}`)}:
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <a
                        href={issue.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                            'rounded-sm text-sm font-medium wrap-break-word text-(--text-color) hover:text-(--accent-color)',
                            FOCUS_RING,
                        )}
                    >
                        {issue.title}
                    </a>
                    <span className="text-xs text-(--text-muted-color)">
                        #{issue.number}
                    </span>
                    {issue.labels.map((label) => (
                        <span
                            key={label.name}
                            className="rounded-full border px-1.5 py-px text-[10px] leading-4 font-medium"
                            style={{
                                borderColor: `${labelColor(label.color)}66`,
                                color: labelColor(label.color),
                            }}
                        >
                            {label.name}
                        </span>
                    ))}
                </div>
                <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--text-muted-color)">
                    {issue.author && <span>{issue.author.login}</span>}
                    <span>
                        {t('github_issue_item.updated', {
                            time: formatTimeAgo(issue.updatedAt, t),
                        })}
                    </span>
                    {issue.commentCount > 0 && (
                        <span className="flex items-center gap-1">
                            <Icon name="MessageSquare" size={11} />
                            {issue.commentCount}
                            <span className="sr-only">
                                {t('github_issue_item.comments')}
                            </span>
                        </span>
                    )}
                </p>
            </div>
            {branchName !== null && (
                <button
                    type="button"
                    disabled={busy || creating || branchCreated}
                    onClick={onCreateBranch}
                    aria-label={
                        branchCreated
                            ? t('github_issue_item.branch_created', {
                                  name: branchName,
                              })
                            : t('github_issue_item.create_branch', {
                                  name: branchName,
                              })
                    }
                    title={
                        branchCreated
                            ? t('github_issue_item.branch_created', {
                                  name: branchName,
                              })
                            : t('github_issue_item.create_branch', {
                                  name: branchName,
                              })
                    }
                    className={cn(
                        'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-(--border-color) bg-transparent text-(--text-gray-color) transition-colors hover:border-(--accent-color) hover:text-(--accent-color) disabled:cursor-not-allowed disabled:opacity-60',
                        branchCreated &&
                            'border-(--success-color)/40 text-(--success-color)',
                        FOCUS_RING,
                    )}
                >
                    <Icon
                        name={
                            branchCreated
                                ? 'Check'
                                : creating
                                  ? 'LoaderCircle'
                                  : 'GitBranch'
                        }
                        size={14}
                        className={cn(
                            creating &&
                                'animate-spin motion-reduce:animate-none',
                        )}
                    />
                </button>
            )}
        </li>
    );
}
