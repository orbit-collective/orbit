import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import { CiRun } from '@/types/Development';
import { cn } from '@/utils/cn';
import { ciLook, formatDuration } from '@/utils/development';
import { FOCUS_RING } from '@/utils/focusRing';

const TONE_TEXT = {
    success: 'text-(--success-color)',
    danger: 'text-(--error-color)',
    warning: 'text-(--warning-color)',
    accent: 'text-(--accent-color)',
    info: 'text-(--info-color)',
    neutral: 'text-(--text-muted-color)',
} as const;

/** Every check of a commit: its result, name and how long it ran, linking to the run on GitHub. */
export default function CiRunList({ runs }: { runs: CiRun[] }) {
    const { t } = useLaravelReactI18n();

    if (runs.length === 0) {
        return (
            <p className="text-xs text-(--text-muted-color)">
                {t('ci_run_list.empty')}
            </p>
        );
    }

    return (
        <ul className="m-0 flex list-none flex-col p-0">
            {runs.map((run, index) => {
                const look = ciLook(run.state);
                const duration = formatDuration(run.durationSeconds);

                return (
                    <li
                        key={`${run.name}-${index}`}
                        className="flex items-center gap-2 border-b border-(--border-color) py-1.5 text-xs last:border-b-0"
                    >
                        <Icon
                            name={look.icon}
                            size={14}
                            className={cn(
                                'shrink-0',
                                TONE_TEXT[look.tone],
                                run.state === 'pending' &&
                                    'animate-spin motion-reduce:animate-none',
                            )}
                        />
                        <span className="sr-only">{t(look.labelKey)}:</span>
                        <span className="min-w-0 flex-1 truncate text-(--text-color)">
                            {run.name}
                        </span>
                        {duration && (
                            <span className="shrink-0 text-(--text-muted-color) tabular-nums">
                                {duration}
                            </span>
                        )}
                        {run.url && (
                            <a
                                href={run.url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={t('ci_run_list.open_run', {
                                    name: run.name,
                                })}
                                className={cn(
                                    'shrink-0 rounded-sm text-(--text-muted-color) hover:text-(--text-color)',
                                    FOCUS_RING,
                                )}
                            >
                                <Icon name="ExternalLink" size={13} />
                            </a>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
