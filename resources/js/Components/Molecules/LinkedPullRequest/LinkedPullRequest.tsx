import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import { LinkedPullRequest as LinkedPullRequestType } from '@/types/Issues';

interface LinkedPullRequestProps {
    pullRequest: LinkedPullRequestType;
}

/**
 * A single linked GitHub pull request, shown on the issue's sidebar (see
 * Issues/Show.tsx). Deliberately minimal per the MVP scope - just enough to
 * identify and open the pull request, no CI/merge/review status.
 */
export default function LinkedPullRequest({
    pullRequest,
}: LinkedPullRequestProps) {
    return (
        <a
            href={pullRequest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full px-1.5 py-1 text-sm text-[var(--text-color)] hover:bg-[var(--bg-light-color)]"
        >
            <BrandIcon name="github" className="h-3.5 w-3.5" />
            {pullRequest.label}
        </a>
    );
}
