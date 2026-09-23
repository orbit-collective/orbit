import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import { LinkedPullRequest } from '@/types/Issues';

interface IssueDevelopmentPanelProps {
    pullRequests: LinkedPullRequest[];
}

/**
 * Every GitHub pull request linked to this issue via the
 * `<!-- orbit-issue:ID -->` marker, shown in the issue's sidebar under a
 * "Development" field. A pre-v0.9.2 link only has provider/number/owner/
 * name/url - status/draft/branches/title render as their empty-state
 * fallback rather than being fabricated. No lifecycle sync yet (v0.9.3):
 * status here is only ever "open" for as long as the link stays unsynced.
 */
export default function IssueDevelopmentPanel({
    pullRequests,
}: IssueDevelopmentPanelProps) {
    if (pullRequests.length === 0) return null;

    return (
        <div className="flex w-full flex-col gap-2">
            {pullRequests.map((pr) => (
                <a
                    key={pr.url}
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[var(--text-color)] transition-colors hover:bg-[var(--bg-light-color)]"
                >
                    <div className="flex items-center gap-1.5">
                        <BrandIcon name="github" className="h-3 w-3 shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                            {pr.title ?? `#${pr.number}`}
                        </span>
                        {(pr.status || pr.draft !== null) && (
                            <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium">
                                {pr.draft ? 'Draft' : 'Open'}
                            </span>
                        )}
                    </div>

                    <span className="truncate text-[11px] text-[var(--text-gray-color)]">
                        {pr.repositoryOwner}/{pr.repositoryName} #{pr.number}
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
            ))}
        </div>
    );
}
