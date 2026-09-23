import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import Icon from '@/Components/Atoms/Icon/Icon';
import { LinkedPullRequest } from '@/types/Issues';

interface IssueDevelopmentPanelProps {
    pullRequests: LinkedPullRequest[];
}

/**
 * The "Development" section on an issue's detail view: every GitHub pull
 * request linked via the `<!-- orbit-issue:ID -->` marker, with whatever
 * metadata is available. A pre-v0.9.2 link only has provider/number/owner/
 * name/url - status/draft/branches/title render as their empty-state
 * fallback rather than being fabricated. No lifecycle sync yet (v0.9.3):
 * status here is only ever "open" for as long as the link stays unsynced.
 */
export default function IssueDevelopmentPanel({
    pullRequests,
}: IssueDevelopmentPanelProps) {
    if (pullRequests.length === 0) return null;

    return (
        <section className="mt-2 flex flex-col gap-3 border-t border-[var(--border-color)] pt-4">
            <span className="text-sm font-medium text-[var(--text-color)]">
                Development
                <span className="ml-1.5 text-xs font-normal text-[var(--text-gray-color)]">
                    {pullRequests.length}
                </span>
            </span>

            <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-color)]">
                {pullRequests.map((pr) => (
                    <a
                        key={pr.url}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 border-b border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-color)] transition-colors last:border-b-0 hover:bg-[var(--bg-light-color)]"
                    >
                        <BrandIcon
                            name="github"
                            className="h-3.5 w-3.5 shrink-0"
                        />

                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate font-medium">
                                {pr.title ?? `#${pr.number}`}
                            </span>
                            <span className="truncate text-[11px] text-[var(--text-gray-color)]">
                                {pr.repositoryOwner}/{pr.repositoryName} #
                                {pr.number}
                                {pr.sourceBranch && pr.targetBranch && (
                                    <span
                                        className="ml-1.5"
                                        title={`${pr.sourceBranch} → ${pr.targetBranch}`}
                                    >
                                        {pr.sourceBranch} → {pr.targetBranch}
                                    </span>
                                )}
                            </span>
                        </div>

                        {(pr.status || pr.draft !== null) && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-color)]">
                                {pr.draft ? 'Draft' : 'Open'}
                            </span>
                        )}

                        <Icon
                            name="ExternalLink"
                            size={12}
                            className="shrink-0 text-[var(--text-gray-color)]"
                        />
                    </a>
                ))}
            </div>
        </section>
    );
}
