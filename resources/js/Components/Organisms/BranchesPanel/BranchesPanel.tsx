import { useLaravelReactI18n } from 'laravel-react-i18n';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import BranchItem from '@/Components/Molecules/BranchItem/BranchItem';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import ListPager from '@/Components/Molecules/ListPager/ListPager';
import { DevelopmentBranch } from '@/types/Development';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

/** Branches per page: a short list that stays in view instead of a scroll. */
export const BRANCHES_PAGE_SIZE = 6;

interface BranchesPanelProps {
    /** The branches of the current page; `null` until that page's answer is there. */
    branches: DevelopmentBranch[] | null;
    /** Every branch of the repository, for the pager (0 until the first answer). */
    total: number;
    page: number;
    onPageChange: (page: number) => void;
    error: string | null;
    onRetry: () => void;
    /** Present when the user may create branches; the button opens the dialog. */
    onCreate?: () => void;
}

/** The repository's branches, default first, with a way to start a new one. */
export default function BranchesPanel({
    branches,
    total,
    page,
    onPageChange,
    error,
    onRetry,
    onCreate,
}: BranchesPanelProps) {
    const { t } = useLaravelReactI18n();

    return (
        <section
            aria-labelledby="development-branches"
            className="rounded-2xl border border-(--border-color) bg-(--surface-color) p-4 sm:p-5"
        >
            <div className="flex items-center justify-between gap-2">
                <div id="development-branches" className="min-w-0 flex-1">
                    <CardHeader
                        icon="GitBranch"
                        title={t('branches_panel.title')}
                    />
                </div>
                {onCreate && (
                    <IconButton
                        iconName="Plus"
                        iconSize={16}
                        onClick={onCreate}
                        ariaLabel={t('branches_panel.create')}
                        title={t('branches_panel.create')}
                        className={FOCUS_RING}
                    />
                )}
            </div>

            <div className="mt-2" aria-live="polite">
                {error && !branches ? (
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
                            {t('branches_panel.retry')}
                        </button>
                    </p>
                ) : !branches ? (
                    <div role="status" aria-label={t('branches_panel.loading')}>
                        {Array.from(
                            { length: BRANCHES_PAGE_SIZE },
                            (_, index) => (
                                <Skeleton
                                    key={index}
                                    index={index}
                                    className="my-3 h-4 w-full"
                                />
                            ),
                        )}
                    </div>
                ) : branches.length === 0 ? (
                    <p className="text-sm text-(--text-gray-color)">
                        {t('branches_panel.empty')}
                    </p>
                ) : (
                    <ul className="m-0 list-none divide-y divide-(--border-color) p-0">
                        {branches.map((branch) => (
                            <BranchItem key={branch.name} branch={branch} />
                        ))}
                    </ul>
                )}
            </div>

            {branches && (
                <ListPager
                    label={t('branches_panel.pager')}
                    page={page}
                    pageSize={BRANCHES_PAGE_SIZE}
                    total={total}
                    onPageChange={onPageChange}
                />
            )}
        </section>
    );
}
