import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import { GithubDevelopmentRepository, LinkedPullRequest } from '@/types/Issues';
import { cva } from 'class-variance-authority';
import { useState } from 'react';

interface IssueDevelopmentPanelProps {
    pullRequests: LinkedPullRequest[];
    repositories?: GithubDevelopmentRepository[];
    defaultBranchName?: string;
    onCreateBranch?: (input: {
        repositoryId: number;
        name: string;
        baseBranch?: string;
    }) => void;
    onCreatePullRequest?: (input: {
        repositoryId: number;
        title: string;
        head: string;
        base: string;
    }) => void;
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

function RepositoryPicker({
    repositories,
    value,
    onChange,
}: {
    repositories: GithubDevelopmentRepository[];
    value: number;
    onChange: (repositoryId: number) => void;
}) {
    if (repositories.length <= 1) return null;

    return (
        <select
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-dark-color)] px-2 py-1.5 text-xs text-[var(--text-color)]"
        >
            {repositories.map((repository) => (
                <option key={repository.id} value={repository.id}>
                    {repository.owner}/{repository.name}
                </option>
            ))}
        </select>
    );
}

function CreateBranchForm({
    repositories,
    defaultBranchName,
    onSubmit,
    onCancel,
}: {
    repositories: GithubDevelopmentRepository[];
    defaultBranchName: string;
    onSubmit: (input: { repositoryId: number; name: string }) => void;
    onCancel: () => void;
}) {
    const [repositoryId, setRepositoryId] = useState(repositories[0].id);
    const [name, setName] = useState(defaultBranchName);

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit({ repositoryId, name });
            }}
            className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-color)] p-2"
        >
            <RepositoryPicker
                repositories={repositories}
                value={repositoryId}
                onChange={setRepositoryId}
            />
            <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="branch-name"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-dark-color)] px-2 py-1.5 text-xs text-[var(--text-color)]"
            />
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={name.trim() === ''}
                    className="rounded-lg bg-[var(--accent-color)] px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Create branch
                </button>
            </div>
        </form>
    );
}

function CreatePullRequestForm({
    repositories,
    defaultBranchName,
    onSubmit,
    onCancel,
}: {
    repositories: GithubDevelopmentRepository[];
    defaultBranchName: string;
    onSubmit: (input: {
        repositoryId: number;
        title: string;
        head: string;
        base: string;
    }) => void;
    onCancel: () => void;
}) {
    const [repositoryId, setRepositoryId] = useState(repositories[0].id);
    const [title, setTitle] = useState('');
    const [head, setHead] = useState(defaultBranchName);
    const [base, setBase] = useState('');

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit({ repositoryId, title, head, base: base || 'main' });
            }}
            className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-color)] p-2"
        >
            <RepositoryPicker
                repositories={repositories}
                value={repositoryId}
                onChange={setRepositoryId}
            />
            <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Pull request title"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-dark-color)] px-2 py-1.5 text-xs text-[var(--text-color)]"
            />
            <input
                value={head}
                onChange={(event) => setHead(event.target.value)}
                placeholder="Source branch"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-dark-color)] px-2 py-1.5 text-xs text-[var(--text-color)]"
            />
            <input
                value={base}
                onChange={(event) => setBase(event.target.value)}
                placeholder="Target branch (default: main)"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-dark-color)] px-2 py-1.5 text-xs text-[var(--text-color)]"
            />
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={title.trim() === '' || head.trim() === ''}
                    className="rounded-lg bg-[var(--accent-color)] px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Create pull request
                </button>
            </div>
        </form>
    );
}

/**
 * Every GitHub pull request linked to this issue via the
 * `<!-- orbit-issue:ID -->` marker, shown in the issue's sidebar under a
 * "Development" field. A pre-v0.9.2 link only has provider/number/owner/
 * name/url - status/draft/branches/title render as their empty-state
 * fallback rather than being fabricated. Since v0.9.3, reopened/closed/
 * synchronize webhook events keep status current, so the badge can show
 * Open, Draft, Closed, or Merged. Since v0.9.4, a project with at least one
 * connected repository also gets "Create branch"/"Create pull request"
 * actions - only "Open pull request" (the link itself) plus these two, no
 * merge/approve/close from Orbit.
 */
export default function IssueDevelopmentPanel({
    pullRequests,
    repositories = [],
    defaultBranchName = '',
    onCreateBranch,
    onCreatePullRequest,
}: IssueDevelopmentPanelProps) {
    const [openForm, setOpenForm] = useState<'branch' | 'pullRequest' | null>(
        null,
    );

    const canCreate =
        repositories.length > 0 && (onCreateBranch || onCreatePullRequest);

    if (pullRequests.length === 0 && !canCreate) return null;

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

            {canCreate && openForm === null && (
                <div className="flex items-center gap-2">
                    {pullRequests.length === 0 && (
                        <span className="text-[11px] text-[var(--text-gray-color)]">
                            No linked pull requests yet.
                        </span>
                    )}
                    {onCreateBranch && (
                        <button
                            type="button"
                            onClick={() => setOpenForm('branch')}
                            className="text-[11px] font-medium text-[var(--accent-color)] hover:underline"
                        >
                            Create branch
                        </button>
                    )}
                    {onCreatePullRequest && (
                        <button
                            type="button"
                            onClick={() => setOpenForm('pullRequest')}
                            className="text-[11px] font-medium text-[var(--accent-color)] hover:underline"
                        >
                            Create pull request
                        </button>
                    )}
                </div>
            )}

            {openForm === 'branch' && onCreateBranch && (
                <CreateBranchForm
                    repositories={repositories}
                    defaultBranchName={defaultBranchName}
                    onSubmit={(input) => {
                        onCreateBranch(input);
                        setOpenForm(null);
                    }}
                    onCancel={() => setOpenForm(null)}
                />
            )}

            {openForm === 'pullRequest' && onCreatePullRequest && (
                <CreatePullRequestForm
                    repositories={repositories}
                    defaultBranchName={defaultBranchName}
                    onSubmit={(input) => {
                        onCreatePullRequest(input);
                        setOpenForm(null);
                    }}
                    onCancel={() => setOpenForm(null)}
                />
            )}
        </div>
    );
}
