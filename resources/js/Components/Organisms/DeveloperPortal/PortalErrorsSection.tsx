import { useMemo, useState } from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import DayBreakdownCard from '@/Components/Molecules/DayBreakdownCard/DayBreakdownCard';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { DayBreakdownDay, DayBreakdownRow } from '@/types/Components';
import { PortalErrorEntry, PortalErrorLog } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/time';

interface PortalErrorsSectionProps {
    /** Undefined while the deferred prop is still loading. */
    errorLog?: PortalErrorLog;
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

function ErrorEntry({ entry }: { entry: PortalErrorEntry }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="px-4 py-3 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-start gap-3 text-left"
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
            {open && entry.trace.length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--bg-dark-color)] p-3 text-[11px] leading-relaxed text-[var(--text-gray-color)]">
                    {entry.trace.join('\n')}
                </pre>
            )}
        </div>
    );
}

export default function PortalErrorsSection({
    errorLog,
}: PortalErrorsSectionProps) {
    const days = useMemo(
        () => (errorLog ? buildDays(errorLog) : []),
        [errorLog],
    );

    if (!errorLog) {
        return (
            <SettingsPanel
                title="Recent errors"
                icon="Bug"
                description="The newest errors from the application log."
            >
                <p
                    role="status"
                    className="animate-pulse px-5 py-6 text-sm text-[var(--text-gray-color)]"
                >
                    Reading the log…
                </p>
            </SettingsPanel>
        );
    }

    return (
        <div className="space-y-5">
            <DayBreakdownCard
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
            >
                {errorLog.entries.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-[var(--text-gray-color)]">
                        No errors in the log. Nice.
                    </p>
                ) : (
                    errorLog.entries.map((entry) => (
                        <ErrorEntry key={entry.id} entry={entry} />
                    ))
                )}
            </SettingsPanel>
        </div>
    );
}
