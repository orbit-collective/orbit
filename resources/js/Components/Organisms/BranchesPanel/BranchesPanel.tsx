import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import BranchItem from '@/Components/Molecules/BranchItem/BranchItem';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import { DevelopmentBranch } from '@/types/Development';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

export const BRANCHES_SHOWN = 6;

interface BranchesPanelProps {
    /** `null` until the first answer. */
    branches: DevelopmentBranch[] | null;
    error: string | null;
    onRetry: () => void;
    /** Present when the user may create branches; the button opens the dialog. */
    onCreate?: () => void;
}

/** The repository's branches, default first, with a way to start a new one. */
export default function BranchesPanel({
    branches,
    error,
    onRetry,
    onCreate,
}: BranchesPanelProps) {
    const { t } = useLaravelReactI18n();
    const [all, setAll] = useState(false);
    const shown = all ? branches : branches?.slice(0, BRANCHES_SHOWN);
    const hidden = (branches?.length ?? 0) - BRANCHES_SHOWN;

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
                ) : !shown ? (
                    <div role="status" aria-label={t('branches_panel.loading')}>
                        <Skeleton className="my-2 h-4 w-full" />
                        <Skeleton index={1} className="my-2 h-4 w-3/4" />
                    </div>
                ) : shown.length === 0 ? (
                    <p className="text-sm text-(--text-gray-color)">
                        {t('branches_panel.empty')}
                    </p>
                ) : (
                    <ul className="m-0 list-none divide-y divide-(--border-color) p-0">
                        {shown.map((branch) => (
                            <BranchItem key={branch.name} branch={branch} />
                        ))}
                    </ul>
                )}
            </div>

            {branches && hidden > 0 && (
                <button
                    type="button"
                    aria-expanded={all}
                    onClick={() => setAll((value) => !value)}
                    className={cn(
                        'mt-2 flex cursor-pointer items-center gap-1 rounded-sm border-none bg-transparent text-xs text-(--accent-color) hover:underline',
                        FOCUS_RING,
                    )}
                >
                    <Icon name={all ? 'ChevronUp' : 'ChevronDown'} size={12} />
                    {all
                        ? t('branches_panel.show_less')
                        : t('branches_panel.show_more', { count: hidden })}
                </button>
            )}
        </section>
    );
}
