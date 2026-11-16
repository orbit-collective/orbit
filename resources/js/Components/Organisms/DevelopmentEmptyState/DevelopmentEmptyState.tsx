import { Link } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

interface DevelopmentEmptyStateProps {
    /** GitHub is not connected at all, or it is but no repository was added. */
    kind: 'not_connected' | 'no_repositories';
    /** Whether the user may open the integration settings to fix it. */
    canConfigure: boolean;
}

/** What the Development view says when there is nothing to show yet, and where to go to change that. */
export default function DevelopmentEmptyState({
    kind,
    canConfigure,
}: DevelopmentEmptyStateProps) {
    const { t } = useLaravelReactI18n();

    return (
        <Reveal className="flex flex-1 items-center justify-center p-6">
            <div className="flex max-w-md flex-col items-center text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-(--border-color-strong) bg-(--surface-color) text-(--text-color)">
                    <BrandIcon name="github" className="h-7 w-7" />
                </span>
                <h3 className="m-0 text-base font-semibold text-(--text-color)">
                    {t(`development_empty_state.${kind}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-(--text-gray-color)">
                    {t(`development_empty_state.${kind}.description`)}
                </p>
                {canConfigure ? (
                    <Link
                        href={route('settings.integrations.show', {
                            integration: 'github',
                        })}
                        className={cn(
                            'mt-5 rounded-xs bg-(--accent-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-colors hover:bg-(--accent-light-color)',
                            FOCUS_RING,
                        )}
                    >
                        {t(`development_empty_state.${kind}.action`)}
                    </Link>
                ) : (
                    <p className="mt-5 text-xs text-(--text-muted-color)">
                        {t('development_empty_state.ask_admin')}
                    </p>
                )}
            </div>
        </Reveal>
    );
}
