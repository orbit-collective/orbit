import { motion } from 'framer-motion';
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
import { formatDate } from '@/utils/time';

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
    critical: '#9c27b0',
};

/** Percent change from the previous day, undefined when there was nothing to compare with. */
export function deltaPercent(current: number, previous?: number) {
    if (previous === undefined || previous === 0) return undefined;

    return ((current - previous) / previous) * 100;
}

export function buildDays(errorLog: PortalErrorLog): DayBreakdownDay[] {
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
            label: day.label,
            dayNumber: day.date.slice(8, 10),
            rows: [
                row('critical', 'Critical'),
                row('error', 'Errors'),
                row('warning', 'Warnings'),
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
            className="transition-colors duration-200 hover:bg-[var(--bg-light-color)]"
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
                            ? 'text-[var(--error-color)]'
                            : 'text-[#9c27b0]',
                    )}
                >
                    {entry.level}
                </Badge>
                <span className="min-w-0 flex-1">
                    <span
                        className={cn(
                            'block text-sm text-[var(--text-color)]',
                            !open && 'truncate',
                        )}
                    >
                        {entry.message}
                    </span>
                    <span className="text-xs text-[var(--text-gray-color)]">
                        {formatDate(entry.loggedAt.replace(' ', 'T'))}
                    </span>
                </span>
            </button>
            <Collapse open={open && entry.trace.length > 0} unmountWhenClosed>
                <pre
                    tabIndex={0}
                    className={cn(
                        'mx-4 mb-3 overflow-x-auto rounded-lg bg-[var(--bg-dark-color)] p-3 text-[11px] leading-relaxed text-[var(--text-gray-color)] sm:mx-5',
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
    const days = useMemo(
        () => (errorLog ? buildDays(errorLog) : []),
        [errorLog],
    );

    if (!errorLog) {
        return (
            <Reveal key="loading">
                <SettingsPanel
                    title="Recent errors"
                    icon="Bug"
                    description="The newest errors from the application log."
                    {...collapse?.('errors')}
                >
                    <p
                        role="status"
                        className="animate-pulse px-5 py-6 text-sm text-[var(--text-gray-color)]"
                    >
                        Reading the log…
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
                    `${errorLog.daily.reduce((sum, day) => sum + day.total, 0)} problems this week`,
                )}
                title="Log activity this week"
                icon="Activity"
                days={days}
                headline={(total) =>
                    `${total} ${total === 1 ? 'problem' : 'problems'}`
                }
                emptyText="The log has nothing for these days."
            />

            <SettingsPanel
                title="Recent errors"
                icon="Bug"
                description="The newest errors from the application log."
                {...collapse?.(
                    'errors',
                    `${errorLog.entries.total} ${errorLog.entries.total === 1 ? 'error' : 'errors'}`,
                )}
            >
                {errorLog.entries.data.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-[var(--text-gray-color)]">
                        No errors in the log. Nice.
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
                    links={errorLog.entries.links}
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
