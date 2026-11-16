import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import SegmentedControl from '@/Components/Atoms/SegmentedControl/SegmentedControl';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import GithubIssueItem from '@/Components/Molecules/GithubIssueItem/GithubIssueItem';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import { DevelopmentGithubIssue } from '@/types/Development';
import { cn } from '@/utils/cn';
import { branchNameFor } from '@/utils/development';
import { FOCUS_RING } from '@/utils/focusRing';

export type GithubIssueState = 'open' | 'closed';

const STATES: readonly GithubIssueState[] = ['open', 'closed'];

const STATE_ICONS = { open: 'CircleDot', closed: 'CircleCheck' } as const;

interface GithubIssuesPanelProps {
    repositoryUrl: string;
    /** `null` until the first answer. */
    issues: DevelopmentGithubIssue[] | null;
    state: GithubIssueState;
    onStateChange: (state: GithubIssueState) => void;
    /** GitHub has more than the page that was read. */
    hasMore: boolean;
    rangeLabel?: string;
    perPage: number;
    perPageOptions: number[];
    onPerPageChange: (perPage: number) => void;
    error: string | null;
    onRetry: () => void;
    /** Present when the user may create branches: starts one named after the issue, at once. */
    onCreateBranch?: (name: string) => Promise<boolean>;
    busy: boolean;
}

/**
 * The repository's GitHub issues, with a button on each that creates a
 * branch named after it (`12-fix-the-login-redirect`) from the default
 * branch in one click. The branches created in this visit are remembered, so
 * a second click cannot ask GitHub for the same branch twice.
 */
export default function GithubIssuesPanel({
    repositoryUrl,
    issues,
    state,
    onStateChange,
    hasMore,
    rangeLabel,
    perPage,
    perPageOptions,
    onPerPageChange,
    error,
    onRetry,
    onCreateBranch,
    busy,
}: GithubIssuesPanelProps) {
    const { t } = useLaravelReactI18n();
    const [page, setPage] = useState(1);
    const [creating, setCreating] = useState<number | null>(null);
    const [created, setCreated] = useState<Set<number>>(new Set());

    const all = issues ?? [];
    const lastPage = Math.max(1, Math.ceil(all.length / perPage));
    const current = Math.min(page, lastPage);
    const visible = all.slice((current - 1) * perPage, current * perPage);

    const create = async (issue: DevelopmentGithubIssue) => {
        if (!onCreateBranch) return;

        setCreating(issue.id);
        const worked = await onCreateBranch(
            branchNameFor(issue.number, issue.title),
        );
        setCreating(null);

        if (worked) setCreated((ids) => new Set(ids).add(issue.id));
    };

    return (
        <section
            aria-labelledby="development-github-issues"
            className="rounded-2xl border border-(--border-color) bg-(--surface-color) p-4 sm:p-5"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div id="development-github-issues">
                    <CardHeader
                        icon="CircleDot"
                        title={t('github_issues_panel.title')}
                        description={rangeLabel}
                    />
                </div>
                <SegmentedControl<GithubIssueState>
                    label={t('github_issues_panel.filter')}
                    value={state}
                    iconOnly
                    onChange={(next) => {
                        onStateChange(next);
                        setPage(1);
                    }}
                    options={STATES.map((key) => ({
                        value: key,
                        label: t(`github_issues_panel.states.${key}`),
                        icon: STATE_ICONS[key],
                    }))}
                />
            </div>

            <div
                className="mt-2"
                aria-busy={issues === null}
                aria-live="polite"
            >
                {error && !issues ? (
                    <div
                        role="alert"
                        className="flex flex-col items-center gap-2 py-8 text-center"
                    >
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
                            {t('github_issues_panel.retry')}
                        </button>
                    </div>
                ) : !issues ? (
                    <div
                        role="status"
                        aria-label={t('github_issues_panel.loading')}
                    >
                        {Array.from(
                            { length: Math.min(perPage, 5) },
                            (_, index) => (
                                <Skeleton
                                    key={index}
                                    index={index}
                                    className="my-3 h-10 w-full rounded-lg"
                                />
                            ),
                        )}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <Icon
                            name="CircleDot"
                            size={22}
                            className="text-(--text-muted-color)"
                        />
                        <p className="m-0 text-sm text-(--text-gray-color)">
                            {t(`github_issues_panel.empty.${state}`)}
                        </p>
                    </div>
                ) : (
                    <ul className="m-0 list-none divide-y divide-(--border-color) p-0">
                        {visible.map((issue) => (
                            <GithubIssueItem
                                key={issue.id}
                                issue={issue}
                                branchName={
                                    onCreateBranch && issue.state === 'open'
                                        ? branchNameFor(
                                              issue.number,
                                              issue.title,
                                          )
                                        : null
                                }
                                branchCreated={created.has(issue.id)}
                                creating={creating === issue.id}
                                busy={busy}
                                onCreateBranch={() => void create(issue)}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {issues && (
                <Pagination
                    variant="compact"
                    total={all.length}
                    page={current}
                    perPage={perPage}
                    perPageOptions={perPageOptions}
                    onPageChange={setPage}
                    onPerPageChange={(size) => {
                        onPerPageChange(size);
                        setPage(1);
                    }}
                />
            )}

            {hasMore && (
                <a
                    href={`${repositoryUrl}/issues`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                        'mt-2 inline-flex items-center gap-1 rounded-sm text-xs text-(--accent-color) hover:underline',
                        FOCUS_RING,
                    )}
                >
                    {t('github_issues_panel.more')}
                    <Icon name="ExternalLink" size={12} />
                </a>
            )}
        </section>
    );
}
