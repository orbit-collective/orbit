import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import { LinkedPullRequest } from '@/types/Issues';
import { cva } from 'class-variance-authority';

interface IssueDevelopmentPanelProps {
    pullRequests: LinkedPullRequest[];
}

const badgeVariants = cva(
    'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
    {
        variants: {
            tone: {
                neutral:
                    'border-[var(--border-color)] text-[var(--text-color)]',
                merged: 'border-[var(--accent-color)] text-[var(--accent-color)]',
                closed: 'border-[var(--error-color)] text-[var(--error-color)]',
            },
        },
    },
);

/**
 * The badge is omitted entirely for a legacy link with neither a status nor
 * a draft flag (pre-v0.9.2), rather than fabricating an "Open" state that
 * was never actually synced from GitHub.
 */
function pullRequestBadge(pr: LinkedPullRequest) {
    if (pr.status === 'merged')
        return { label: 'Merged', tone: 'merged' as const };
    if (pr.status === 'closed')
        return { label: 'Closed', tone: 'closed' as const };
    if (pr.status === 'open' || pr.draft !== null) {
        return { label: pr.draft ? 'Draft' : 'Open', tone: 'neutral' as const };
    }
    return null;
}

/**
 * Every GitHub pull request linked to this issue via the
 * `<!-- orbit-issue:ID -->` marker, shown in the issue's sidebar under a
 * "Development" field. A pre-v0.9.2 link only has provider/number/owner/
 * name/url - status/draft/branches/title render as their empty-state
 * fallback rather than being fabricated. Since v0.9.3, reopened/closed/
 * synchronize webhook events keep status current, so the badge can show
 * Open, Draft, Closed, or Merged.
 */
export default function IssueDevelopmentPanel({
    pullRequests,
}: IssueDevelopmentPanelProps) {
    if (pullRequests.length === 0) return null;

    return (
        <div className="flex w-full flex-col gap-2">
            {pullRequests.map((pr) => {
                const badge = pullRequestBadge(pr);

                return (
                    <a
                        key={pr.url}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[var(--text-color)] transition-colors hover:bg-[var(--bg-light-color)]"
                    >
                        <div className="flex items-center gap-1.5">
                            <BrandIcon
                                name="github"
                                className="h-3 w-3 shrink-0"
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">
                                {pr.title ?? `#${pr.number}`}
                            </span>
                            {badge && (
                                <span
                                    className={badgeVariants({
                                        tone: badge.tone,
                                    })}
                                >
                                    {badge.label}
                                </span>
                            )}
                        </div>

                        <span className="truncate text-[11px] text-[var(--text-gray-color)]">
                            {pr.repositoryOwner}/{pr.repositoryName} #
                            {pr.number}
                        </span>

                        {pr.sourceBranch && pr.targetBranch && (
                            <span
                                className="truncate text-[11px] text-[var(--text-gray-color)]"
                                title={`${pr.sourceBranch} → ${pr.targetBranch}`}
                            >
                                {pr.sourceBranch} → {pr.targetBranch}
                            </span>
                        )}
                    </a>
                );
            })}
        </div>
    );
}
