import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useMemo, useState } from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import DayBreakdownCard from '@/Components/Molecules/DayBreakdownCard/DayBreakdownCard';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { CollapseProps } from '@/hooks/useCollapsedSections';
import { DayBreakdownDay, DayBreakdownRow } from '@/types/Components';
import { PortalErrorEntry, PortalErrorLog } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';
import { FOCUS_RING_INSET } from '@/utils/focusRing';
import { rowDelay, rowIn } from '@/utils/motion';
import { linksForCurrentQuery } from '@/utils/portalLinks';
import { formatDate, intlLocale } from '@/utils/time';

interface PortalErrorsSectionProps {
    /** Undefined while the deferred prop is still loading. */
    errorLog?: PortalErrorLog;
    /** The page's current query string, so a page change keeps the other lists. */
    queryParams?: Record<string, string>;
    collapse?: CollapseProps;
}

const COLORS = {
    warning: 'var(--warning-color)',
    error: 'var(--error-color)',
    // The theme's accent is the portal's purple: no hardcoded hex.
    critical: 'var(--accent-color)',
};

/** Percent change from the previous day, undefined when there was nothing to compare with. */
export function deltaPercent(current: number, previous?: number) {
    if (previous === undefined || previous === 0) return undefined;

    return ((current - previous) / previous) * 100;
}

const DEFAULT_LEVEL_LABELS = {
    critical: 'Critical',
    error: 'Errors',
    warning: 'Warnings',
};

/** `labels` are the already translated names of the three levels. */
export function buildDays(
    errorLog: PortalErrorLog,
    labels: Record<
        'critical' | 'error' | 'warning',
        string
    > = DEFAULT_LEVEL_LABELS,
    /** Intl locale; when set the weekday is drawn from the date instead of the server's English label. */
    locale?: string,
): DayBreakdownDay[] {
    return errorLog.daily.map((day, index): DayBreakdownDay => {
        const before = errorLog.daily[index - 1];
        const row = (
            key: 'warning' | 'error' | 'critical',
            label: string,
        ): DayBreakdownRow => ({
            key,
            label,
            value: day[key],
            color: COLORS[key],
            delta: deltaPercent(day[key], before?.[key]),
        });

        return {
            key: day.date,
            label: locale
                ? new Date(
                      Number(day.date.slice(0, 4)),
                      Number(day.date.slice(5, 7)) - 1,
                      Number(day.date.slice(8, 10)),
                  ).toLocaleDateString(locale, { weekday: 'short' })
                : day.label,
            dayNumber: day.date.slice(8, 10),
            rows: [
                row('critical', labels.critical),
                row('error', labels.error),
                row('warning', labels.warning),
            ],
        };
    });
}

function ErrorEntry({
    entry,
    index,
}: {
    entry: PortalErrorEntry;
    index: number;
}) {
    const [open, setOpen] = useState(false);

    return (
        <motion.div
            variants={rowIn}
            initial="hidden"
            animate="show"
            transition={{ delay: rowDelay(index) }}
            className="transition-colors duration-200 hover:bg-(--bg-light-color)"
        >
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className={cn(
                    'flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent px-4 py-3 text-left sm:px-5',
                    FOCUS_RING_INSET,
                )}
            >
                <Badge
                    variant="outline"
                    className={cn(
                        'mt-0.5 shrink-0 uppercase',
                        entry.level === 'error'
                            ? 'text-(--error-color)'
                            : 'text-(--accent-color)',
                    )}
                >
                    {entry.level}
                </Badge>
                <span className="min-w-0 flex-1">
                    <span
                        className={cn(
                            'block text-sm text-(--text-color)',
                            !open && 'truncate',
                        )}
                    >
                        {entry.message}
                    </span>
                    <span className="text-xs text-(--text-gray-color)">
                        {formatDate(entry.loggedAt.replace(' ', 'T'))}
                    </span>
                </span>
            </button>
            <Collapse open={open && entry.trace.length > 0} unmountWhenClosed>
                <pre
                    tabIndex={0}
                    className={cn(
                        'mx-4 mb-3 overflow-x-auto rounded-lg bg-(--bg-dark-color) p-3 text-[11px] leading-relaxed text-(--text-gray-color) sm:mx-5',
                        FOCUS_RING_INSET,
                    )}
                >
                    {entry.trace.join('\n')}
                </pre>
            </Collapse>
        </motion.div>
    );
}

export default function PortalErrorsSection({
    errorLog,
    queryParams = {},
    collapse,
}: PortalErrorsSectionProps) {
    const { t, tChoice, currentLocale } = useLaravelReactI18n();
    const days = useMemo(
        () =>
            errorLog
                ? buildDays(
                      errorLog,
                      {
                          critical: t(
                              'developer_portal.errors.levels.critical',
                          ),
                          error: t('developer_portal.errors.levels.error'),
                          warning: t('developer_portal.errors.levels.warning'),
                      },
                      intlLocale(currentLocale()),
                  )
                : [],
        [errorLog, t, currentLocale],
    );

    if (!errorLog) {
        return (
            <Reveal key="loading">
                <SettingsPanel
                    title={t('developer_portal.errors.title')}
                    icon="Bug"
                    description={t('developer_portal.errors.description')}
                    {...collapse?.('errors')}
                >
                    <p
                        role="status"
                        className="animate-pulse px-5 py-6 text-sm text-(--text-gray-color)"
                    >
                        {t('developer_portal.errors.reading')}
                    </p>
                </SettingsPanel>
            </Reveal>
        );
    }

    return (
        <Reveal key="loaded" className="space-y-5">
            <DayBreakdownCard
                {...collapse?.(
                    'activity',
                    t('developer_portal.errors.problems_this_week', {
                        count: errorLog.daily.reduce(
                            (sum, day) => sum + day.total,
                            0,
                        ),
                    }),
                )}
                title={t('developer_portal.errors.activity_title')}
                icon="Activity"
                days={days}
                headline={(total) =>
                    tChoice('developer_portal.errors.problems', total)
                }
                emptyText={t('developer_portal.errors.activity_empty')}
            />

            <SettingsPanel
                title={t('developer_portal.errors.title')}
                icon="Bug"
                description={t('developer_portal.errors.description')}
                {...collapse?.(
                    'errors',
                    tChoice(
                        'developer_portal.errors.count',
                        errorLog.entries.total,
                    ),
                )}
            >
                {errorLog.entries.data.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-(--text-gray-color)">
                        {t('developer_portal.errors.none')}
                    </p>
                ) : (
                    errorLog.entries.data.map((entry, index) => (
                        <ErrorEntry
                            key={entry.id}
                            entry={entry}
                            index={index}
                        />
                    ))
                )}
                <Pagination
                    links={linksForCurrentQuery(
                        errorLog.entries.links,
                        'errors_page',
                        queryParams,
                    )}
                    from={errorLog.entries.from ?? 0}
                    to={errorLog.entries.to ?? 0}
                    total={errorLog.entries.total}
                    queryParams={queryParams}
                    pageParam="errors_page"
                    perPageParam="errors_perPage"
                    preserveState
                    only={['errorLog']}
                />
            </SettingsPanel>
        </Reveal>
    );
}
