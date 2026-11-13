import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssuePreviewCard from '@/Components/Molecules/IssuePreviewCard/IssuePreviewCard';
import { CalendarViewProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
import { DURATION, EASE, SPRING } from '@/utils/motion';
import { parseDateKey } from '@/utils/time';

type ViewMode = 'month' | 'week';

const MAX_VISIBLE_ISSUES_PER_DAY: Record<ViewMode, number> = {
    month: 3,
    week: 6,
};

/** An issue without a priority gets the neutral chip. */
const NO_PRIORITY_COLOR = 'var(--text-muted-color)';

/**
 * The chip is tinted with its priority's own color: a solid left edge and a
 * faint wash, the same look the three fixed priorities used to have.
 */
const chipStyle = (issue: Issue): React.CSSProperties => {
    const color = issue.priorityDetails?.color ?? NO_PRIORITY_COLOR;

    return {
        borderLeftColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
    };
};

/** Month name (`long`, nominative) or abbreviation (`short`) in the given locale. */
const monthName = (locale: string, month: number, style: 'long' | 'short') =>
    new Intl.DateTimeFormat(locale, { month: style }).format(
        new Date(2000, month, 1),
    );

/** The seven weekday abbreviations in the given locale, Sunday first. */
const weekdayNames = (locale: string) => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // 2023-01-01 was a Sunday.
    return Array.from({ length: 7 }, (_, i) =>
        formatter.format(new Date(2023, 0, 1 + i)),
    );
};

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfWeek = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - start.getDay());
    return start;
};

const CalendarView: React.FC<CalendarViewProps> = ({
    issues,
    onRangeChange,
}) => {
    const { t, tChoice, currentLocale } = useLaravelReactI18n();
    const locale = currentLocale();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [preview, setPreview] = useState<{
        issue: Issue;
        rect: DOMRect;
    } | null>(null);

    const daysInMonth = (year: number, month: number) =>
        new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) =>
        new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthDays = useMemo(() => {
        const days = [];
        const prevMonthDays = daysInMonth(year, month - 1);
        const firstDay = firstDayOfMonth(year, month);

        // Prev month padding
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                month: month - 1,
                year,
                isCurrentMonth: false,
                dateKey: `${year}-${String(month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`,
            });
        }

        // Current month
        const count = daysInMonth(year, month);
        for (let i = 1; i <= count; i++) {
            days.push({
                day: i,
                month,
                year,
                isCurrentMonth: true,
                dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
            });
        }

        // Next month padding
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                day: i,
                month: month + 1,
                year,
                isCurrentMonth: false,
                dateKey: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
            });
        }
        return days;
    }, [year, month]);

    const weekViewDays = useMemo(() => {
        const start = startOfWeek(currentDate);
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            return {
                day: date.getDate(),
                month: date.getMonth(),
                year: date.getFullYear(),
                isCurrentMonth: true,
                dateKey: toDateKey(date),
            };
        });
    }, [currentDate]);

    const visibleDays = viewMode === 'month' ? monthDays : weekViewDays;

    // The page only sends the issues that fall in the visible range, so tell
    // it which days are on screen (the month grid's 42 days, or the week).
    const rangeFrom =
        viewMode === 'month'
            ? toDateKey(new Date(year, month, 1 - firstDayOfMonth(year, month)))
            : weekViewDays[0].dateKey;
    const rangeTo =
        viewMode === 'month'
            ? toDateKey(
                  new Date(year, month, 42 - firstDayOfMonth(year, month)),
              )
            : weekViewDays[6].dateKey;

    useEffect(() => {
        onRangeChange?.(rangeFrom, rangeTo);
    }, [rangeFrom, rangeTo]);

    const issuesByDate = useMemo(() => {
        const map: Record<string, Issue[]> = {};
        const MAX_SPAN_DAYS = 366;

        issues.forEach((issue) => {
            if (!issue.start_date) return;

            const start = parseDateKey(issue.start_date);
            const end = issue.end_date ? parseDateKey(issue.end_date) : start;

            if (end < start) {
                const key = toDateKey(start);
                (map[key] ??= []).push(issue);
                return;
            }

            const cursor = new Date(start);
            let guard = 0;
            while (cursor <= end && guard < MAX_SPAN_DAYS) {
                const key = toDateKey(cursor);
                (map[key] ??= []).push(issue);
                cursor.setDate(cursor.getDate() + 1);
                guard += 1;
            }
        });

        return map;
    }, [issues]);

    const weekDayLabels = useMemo(() => weekdayNames(locale), [locale]);

    // Which way the user is paging, so the title and the grid slide that way.
    const [direction, setDirection] = useState<1 | -1>(1);

    const goNext = () => {
        setDirection(1);
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month + 1, 1));
        } else {
            setCurrentDate((prev) => {
                const next = new Date(prev);
                next.setDate(next.getDate() + 7);
                return next;
            });
        }
    };

    const goPrev = () => {
        setDirection(-1);
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month - 1, 1));
        } else {
            setCurrentDate((prev) => {
                const next = new Date(prev);
                next.setDate(next.getDate() - 7);
                return next;
            });
        }
    };

    const goToToday = () => setCurrentDate(new Date());

    const headerLabel = useMemo(() => {
        if (viewMode === 'month') {
            return (
                <>
                    {monthName(locale, month, 'long')}{' '}
                    <span className="font-medium text-(--text-muted-color)">
                        {year}
                    </span>
                </>
            );
        }

        const start = weekViewDays[0];
        const end = weekViewDays[6];
        const startLabel = `${monthName(locale, start.month, 'short')} ${start.day}`;
        const endLabel =
            start.month === end.month
                ? `${end.day}`
                : `${monthName(locale, end.month, 'short')} ${end.day}`;

        return (
            <>
                {startLabel} – {endLabel}{' '}
                <span className="font-medium text-(--text-muted-color)">
                    {end.year}
                </span>
            </>
        );
    }, [viewMode, month, year, weekViewDays, locale]);

    return (
        <div className="flex min-h-[600px] min-w-0 flex-1 flex-col p-6 xl:h-full xl:min-h-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.h2
                            key={`${viewMode}:${visibleDays[0]?.dateKey}`}
                            data-testid="calendar-title"
                            initial={{ opacity: 0, x: direction * 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: direction * -16 }}
                            transition={{
                                duration: DURATION.fast,
                                ease: EASE,
                            }}
                            className="text-2xl font-bold text-(--text-color)"
                        >
                            {headerLabel}
                        </motion.h2>
                    </AnimatePresence>
                    <div className="flex items-center gap-1 rounded-xl border border-(--border-color) bg-(--bg-light-color) p-1">
                        <button
                            type="button"
                            onClick={goPrev}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-(--text-gray-color) transition-all hover:bg-(--bg-light-color-hover) hover:text-(--text-color)"
                        >
                            <Icon name="ChevronLeft" size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={goToToday}
                            className="px-3 py-1 text-xs font-semibold text-(--text-gray-color) transition-all hover:text-(--text-color)"
                        >
                            {t('calendar_view.today')}
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-(--text-gray-color) transition-all hover:bg-(--bg-light-color-hover) hover:text-(--text-color)"
                        >
                            <Icon name="ChevronRight" size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 text-[11px] font-medium text-(--text-muted-color)">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-(--error-color)" />
                            {t('calendar_view.priority_high')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-(--warning-color)" />
                            {t('calendar_view.priority_medium')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-(--success-color)" />
                            {t('calendar_view.priority_low')}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 rounded-xl border border-(--border-color) bg-(--bg-light-color) p-1">
                        {(['month', 'week'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                aria-pressed={viewMode === mode}
                                className={cn(
                                    'relative rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-colors',
                                    viewMode === mode
                                        ? 'text-white'
                                        : 'text-(--text-gray-color) hover:text-(--text-color)',
                                )}
                            >
                                {viewMode === mode && (
                                    <motion.span
                                        layoutId="calendar-mode"
                                        transition={SPRING}
                                        aria-hidden="true"
                                        className="absolute inset-0 rounded-lg bg-(--accent-color)"
                                    />
                                )}
                                <span className="relative">
                                    {t(`calendar_view.mode.${mode}`)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-(--border-color) bg-(--surface-color)">
                <div className="grid grid-cols-1 border-b border-(--border-color) bg-(--bg-light-color) sm:grid-cols-7">
                    {weekDayLabels.map((day) => (
                        <div
                            key={day}
                            className="hidden py-3 text-center text-[10px] font-bold tracking-widest text-(--text-muted-color) uppercase sm:block"
                        >
                            {day}
                        </div>
                    ))}
                    <div className="py-3 text-center text-[10px] font-bold tracking-widest text-(--text-muted-color) uppercase sm:hidden">
                        {t('calendar_view.schedule')}
                    </div>
                </div>

                <div className="grid flex-1 grid-cols-1 overflow-y-auto sm:grid-cols-7 sm:overflow-hidden">
                    {visibleDays.map((dayObj, i) => {
                        const dayIssues = issuesByDate[dayObj.dateKey] || [];
                        const maxVisible = MAX_VISIBLE_ISSUES_PER_DAY[viewMode];
                        const visibleIssues = dayIssues.slice(0, maxVisible);
                        const hiddenCount =
                            dayIssues.length - visibleIssues.length;
                        const isToday =
                            new Date().toDateString() ===
                            new Date(
                                dayObj.year,
                                dayObj.month,
                                dayObj.day,
                            ).toDateString();

                        return (
                            <motion.div
                                key={dayObj.dateKey}
                                data-testid="calendar-day"
                                // A wave runs across the grid from the top left.
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    duration: DURATION.base,
                                    ease: EASE,
                                    delay: ((i % 7) + Math.floor(i / 7)) * 0.02,
                                }}
                                className={cn(
                                    'relative flex flex-col gap-1.5 border-b border-(--border-color) p-2.5 transition-colors hover:bg-(--bg-light-color) sm:border-r',
                                    viewMode === 'month'
                                        ? 'min-h-[132px]'
                                        : 'min-h-[260px]',
                                    isToday && 'bg-(--accent-color)/4',
                                    !dayObj.isCurrentMonth &&
                                        'hidden bg-(--overlay-color) opacity-40 sm:flex',
                                    i % 7 === 6 && 'sm:border-r-0',
                                    dayIssues.length === 0 && 'hidden sm:flex',
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                                                isToday
                                                    ? 'shadow-[0_0_15px_var(--accent-color)]/30 bg-(--accent-color) text-white'
                                                    : 'text-(--text-muted-color)',
                                            )}
                                        >
                                            {dayObj.day}
                                        </span>
                                        <span className="text-[10px] font-bold tracking-widest text-(--text-muted-color) uppercase sm:hidden">
                                            {weekDayLabels[i % 7]}
                                        </span>
                                    </div>
                                    {dayIssues.length > 0 && (
                                        <span className="hidden text-[10px] font-bold text-(--text-muted-color) 2xl:block">
                                            {tChoice(
                                                'calendar_view.items',
                                                dayIssues.length,
                                            )}
                                        </span>
                                    )}
                                </div>

                                <div className="no-scrollbar flex flex-col gap-1 overflow-y-auto">
                                    {visibleIssues.map((issue) => (
                                        <motion.button
                                            key={issue.id}
                                            type="button"
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() =>
                                                router.visit(
                                                    route('issues.show', [
                                                        issue.project_id,
                                                        issue.id,
                                                    ]),
                                                )
                                            }
                                            onMouseEnter={(e) =>
                                                setPreview({
                                                    issue,
                                                    rect: e.currentTarget.getBoundingClientRect(),
                                                })
                                            }
                                            onMouseLeave={() =>
                                                setPreview(null)
                                            }
                                            style={chipStyle(issue)}
                                            className={cn(
                                                'flex items-center rounded-r-md border-l-2 px-2 py-1.5 text-left transition-all hover:brightness-125 sm:py-1',
                                            )}
                                        >
                                            <span className="truncate text-xs font-medium text-(--text-color) sm:text-[11px]">
                                                {issue.title}
                                            </span>
                                        </motion.button>
                                    ))}
                                    {hiddenCount > 0 && (
                                        <span className="px-2 text-[10px] font-semibold text-(--text-muted-color)">
                                            {t('calendar_view.more', {
                                                count: hiddenCount,
                                            })}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {preview &&
                createPortal(
                    <IssuePreviewCard
                        issue={preview.issue}
                        anchorRect={preview.rect}
                    />,
                    document.body,
                )}
        </div>
    );
};

export default CalendarView;
