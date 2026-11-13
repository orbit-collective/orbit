import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useMemo } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { UpcomingDeadlinesPanelProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
import { parseDateKey } from '@/utils/time';
import { isIssueDone } from '@/utils/workflow';

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

const getDeadlineMeta = (
    endDate: string,
    t: (key: string, replacements?: Record<string, string | number>) => string,
    locale: string,
) => {
    const end = parseDateKey(endDate);
    const diffDays = Math.round(
        (end.getTime() - startOfToday().getTime()) / 86_400_000,
    );

    if (diffDays < 0) {
        return {
            label:
                diffDays === -1
                    ? t('upcoming_deadlines.overdue_one')
                    : t('upcoming_deadlines.overdue_many', {
                          days: Math.abs(diffDays),
                      }),
            colorClass: 'text-(--error-color)',
        };
    }
    if (diffDays === 0) {
        return {
            label: t('upcoming_deadlines.due_today'),
            colorClass: 'text-(--warning-color)',
        };
    }
    if (diffDays === 1) {
        return {
            label: t('upcoming_deadlines.due_tomorrow'),
            colorClass: 'text-(--warning-color)',
        };
    }
    if (diffDays <= 7) {
        return {
            label: t('upcoming_deadlines.due_in_days', { days: diffDays }),
            colorClass: 'text-(--text-muted-color)',
        };
    }
    return {
        label: end.toLocaleDateString(
            locale === 'pl' ? 'pl-PL' : 'en-US',
            SHORT_DATE_FORMAT,
        ),
        colorClass: 'text-(--text-muted-color)',
    };
};

const UpcomingDeadlinesPanel: React.FC<UpcomingDeadlinesPanelProps> = ({
    issues,
}) => {
    const { t, currentLocale } = useLaravelReactI18n();
    const locale = currentLocale();
    const upcoming = useMemo(() => {
        return issues
            .filter(
                (issue): issue is Issue & { end_date: string } =>
                    Boolean(issue.end_date) && !isIssueDone(issue),
            )
            .sort(
                (a, b) =>
                    parseDateKey(a.end_date).getTime() -
                    parseDateKey(b.end_date).getTime(),
            );
    }, [issues]);

    return (
        <Reveal className="flex h-full items-center p-6">
            <div className="flex max-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-solid border-(--border-color) bg-(--surface-color) p-4 xl:w-80 xl:shrink-0">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase">
                        {t('upcoming_deadlines.title')}
                    </h3>
                    {upcoming.length > 0 && (
                        <span className="text-[10px] font-medium text-(--text-muted-color)">
                            <AnimatedNumber value={upcoming.length} />
                        </span>
                    )}
                </div>

                {upcoming.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                        <Icon
                            name="CalendarClock"
                            size={22}
                            className="text-(--text-muted-color)"
                        />
                        <p className="text-xs font-medium text-(--text-muted-color)">
                            {t('upcoming_deadlines.empty')}
                        </p>
                    </div>
                ) : (
                    <div className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto">
                        {upcoming.map((issue, index) => {
                            const { label, colorClass } = getDeadlineMeta(
                                issue.end_date,
                                t,
                                locale,
                            );

                            return (
                                <RowReveal key={issue.id} index={index}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.visit(
                                                route('issues.show', [
                                                    issue.project_id,
                                                    issue.id,
                                                ]),
                                            )
                                        }
                                        className="group flex w-full items-start gap-2.5 rounded-xl border border-solid border-transparent px-2.5 py-2.5 text-left transition-all hover:border-(--border-color) hover:bg-(--bg-light-color)"
                                    >
                                        <StatusDot
                                            color={issue.priorityDetails?.color}
                                            size="sm"
                                            className="mt-1.5 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-semibold text-(--text-color)">
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
                                                            issue.assignee
                                                                .avatar ??
                                                            undefined
                                                        }
                                                        alt={
                                                            issue.assignee.name
                                                        }
                                                        initials={issue.assignee.name.charAt(
                                                            0,
                                                        )}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </RowReveal>
                            );
                        })}
                    </div>
                )}
            </div>
        </Reveal>
    );
};

export default UpcomingDeadlinesPanel;
