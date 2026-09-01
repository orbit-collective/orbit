import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { UpcomingDeadlinesPanelProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
import { parseDateKey } from '@/utils/time';
import { router } from '@inertiajs/react';
import React, { useMemo } from 'react';

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
};

const startOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

const getDeadlineMeta = (endDate: string) => {
    const end = parseDateKey(endDate);
    const diffDays = Math.round(
        (end.getTime() - startOfToday().getTime()) / 86_400_000,
    );

    if (diffDays < 0) {
        return {
            label:
                diffDays === -1
                    ? 'Overdue by 1 day'
                    : `Overdue by ${Math.abs(diffDays)} days`,
            colorClass: 'text-[var(--error-color)]',
        };
    }
    if (diffDays === 0) {
        return {
            label: 'Due today',
            colorClass: 'text-[var(--warning-color)]',
        };
    }
    if (diffDays === 1) {
        return {
            label: 'Due tomorrow',
            colorClass: 'text-[var(--warning-color)]',
        };
    }
    if (diffDays <= 7) {
        return {
            label: `Due in ${diffDays} days`,
            colorClass: 'text-[var(--text-muted-color)]',
        };
    }
    return {
        label: end.toLocaleDateString('en-US', SHORT_DATE_FORMAT),
        colorClass: 'text-[var(--text-muted-color)]',
    };
};

const UpcomingDeadlinesPanel: React.FC<UpcomingDeadlinesPanelProps> = ({
    issues,
}) => {
    const upcoming = useMemo(() => {
        return issues
            .filter(
                (issue): issue is Issue & { end_date: string } =>
                    Boolean(issue.end_date) && issue.status !== 'closed',
            )
            .sort(
                (a, b) =>
                    parseDateKey(a.end_date).getTime() -
                    parseDateKey(b.end_date).getTime(),
            );
    }, [issues]);

    return (
        <div className={'flex h-full items-center p-6'}>
            <div className="flex max-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4 xl:w-80 xl:shrink-0">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                        Upcoming Deadlines
                    </h3>
                    {upcoming.length > 0 && (
                        <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                            {upcoming.length}
                        </span>
                    )}
                </div>

                {upcoming.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                        <Icon
                            name="CalendarClock"
                            size={22}
                            className="text-[var(--text-muted-color)]"
                        />
                        <p className="text-xs font-medium text-[var(--text-muted-color)]">
                            No upcoming deadlines
                        </p>
                    </div>
                ) : (
                    <div className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto">
                        {upcoming.map((issue) => {
                            const { label, colorClass } = getDeadlineMeta(
                                issue.end_date,
                            );

                            return (
                                <button
                                    key={issue.id}
                                    type="button"
                                    onClick={() =>
                                        router.visit(
                                            route('issues.show', [
                                                issue.project_id,
                                                issue.id,
                                            ]),
                                        )
                                    }
                                    className="group flex items-start gap-2.5 rounded-xl border border-solid border-transparent px-2.5 py-2.5 text-left transition-all hover:border-[var(--border-color)] hover:bg-[var(--bg-light-color)]"
                                >
                                    <StatusDot
                                        status={issue.priority}
                                        size="sm"
                                        className="mt-1.5 shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-[var(--text-color)]">
                                            {issue.title}
                                        </p>
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                            <span
                                                className={cn(
                                                    'text-[10px] font-medium',
                                                    colorClass,
                                                )}
                                            >
                                                {label}
                                            </span>
                                            {issue.assignee && (
                                                <Avatar
                                                    src={
                                                        issue.assignee.avatar ??
                                                        undefined
                                                    }
                                                    alt={issue.assignee.name}
                                                    initials={issue.assignee.name.charAt(
                                                        0,
                                                    )}
                                                    size="sm"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpcomingDeadlinesPanel;
