import { useLaravelReactI18n } from 'laravel-react-i18n';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import CommitItem from '@/Components/Molecules/CommitItem/CommitItem';
import { DevelopmentCommit } from '@/types/Development';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

interface CommitsPanelProps {
    /** `null` until the first answer. */
    commits: DevelopmentCommit[] | null;
    branch: string | null;
    repositoryUrl: string;
    error: string | null;
    onRetry: () => void;
}

/** The latest commits of the default branch, with who made them. */
export default function CommitsPanel({
    commits,
    branch,
    repositoryUrl,
    error,
    onRetry,
}: CommitsPanelProps) {
    const { t } = useLaravelReactI18n();

    return (
        <section
            aria-labelledby="development-commits"
            className="rounded-2xl border border-(--border-color) bg-(--surface-color) p-4 sm:p-5"
        >
            <div id="development-commits">
                <CardHeader
                    icon="GitCommitHorizontal"
                    title={t('commits_panel.title')}
                    description={
                        branch ? t('commits_panel.on', { branch }) : undefined
                    }
                />
            </div>

            <div className="mt-2" aria-live="polite">
                {error && !commits ? (
                    <p role="alert" className="text-xs text-(--error-color)">
                        {error}{' '}
                        <button
                            type="button"
                            onClick={onRetry}
                            className={cn(
                                'cursor-pointer rounded-sm border-none bg-transparent text-(--accent-color) underline',
                                FOCUS_RING,
                            )}
                        >
                            {t('commits_panel.retry')}
                        </button>
                    </p>
                ) : !commits ? (
                    <div role="status" aria-label={t('commits_panel.loading')}>
                        <Skeleton className="my-2 h-8 w-full" />
                        <Skeleton index={1} className="my-2 h-8 w-full" />
                    </div>
                ) : commits.length === 0 ? (
                    <p className="text-sm text-(--text-gray-color)">
                        {t('commits_panel.empty')}
                    </p>
                ) : (
                    <ul className="m-0 list-none divide-y divide-(--border-color) p-0">
                        {commits.map((commit) => (
                            <CommitItem key={commit.sha} commit={commit} />
                        ))}
                    </ul>
                )}
            </div>

            <a
                href={`${repositoryUrl}/commits${branch ? `/${branch}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className={cn(
                    'mt-2 inline-block rounded-sm text-xs text-(--accent-color) hover:underline',
                    FOCUS_RING,
                )}
            >
                {t('commits_panel.all')}
            </a>
        </section>
    );
}
