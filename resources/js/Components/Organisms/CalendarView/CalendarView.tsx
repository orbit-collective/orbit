import Icon from '@/Components/Atoms/Icon/Icon';
import IssuePreviewCard from '@/Components/Molecules/IssuePreviewCard/IssuePreviewCard';
import { CalendarViewProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
import { parseDateKey } from '@/utils/time';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type ViewMode = 'month' | 'week';

const MAX_VISIBLE_ISSUES_PER_DAY: Record<ViewMode, number> = {
    month: 3,
    week: 6,
};

const PRIORITY_CHIP_CLASSES: Record<Issue['priority'], string> = {
    high: 'border-l-[var(--error-color)] bg-[var(--error-color)]/10 hover:bg-[var(--error-color)]/15',
    medium: 'border-l-[var(--warning-color)] bg-[var(--warning-color)]/10 hover:bg-[var(--warning-color)]/15',
    low: 'border-l-[var(--success-color)] bg-[var(--success-color)]/10 hover:bg-[var(--success-color)]/15',
};

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfWeek = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - start.getDay());
    return start;
};

const CalendarView: React.FC<CalendarViewProps> = ({ issues }) => {
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

    const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const goNext = () => {
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
                    {MONTH_NAMES[month]}{' '}
                    <span className="font-medium text-[var(--text-muted-color)]">
                        {year}
                    </span>
                </>
            );
        }

        const start = weekViewDays[0];
        const end = weekViewDays[6];
        const startLabel = `${MONTH_NAMES[start.month].slice(0, 3)} ${start.day}`;
        const endLabel =
            start.month === end.month
                ? `${end.day}`
                : `${MONTH_NAMES[end.month].slice(0, 3)} ${end.day}`;

        return (
            <>
                {startLabel} – {endLabel}{' '}
                <span className="font-medium text-[var(--text-muted-color)]">
                    {end.year}
                </span>
            </>
        );
    }, [viewMode, month, year, weekViewDays]);

    return (
        <div className="flex min-h-[600px] min-w-0 flex-1 flex-col p-6 xl:h-full xl:min-h-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-[var(--text-color)]">
                        {headerLabel}
                    </h2>
                    <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-light-color)] p-1">
                        <button
                            type="button"
                            onClick={goPrev}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-all hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)]"
                        >
                            <Icon name="ChevronLeft" size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={goToToday}
                            className="px-3 py-1 text-xs font-semibold text-[var(--text-gray-color)] transition-all hover:text-[var(--text-color)]"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-all hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)]"
                        >
                            <Icon name="ChevronRight" size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--text-muted-color)]">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[var(--error-color)]" />
                            High
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[var(--warning-color)]" />
                            Medium
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[var(--success-color)]" />
                            Low
                        </span>
                    </div>

                    <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-light-color)] p-1">
                        {(['month', 'week'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    'rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-all',
                                    viewMode === mode
                                        ? 'bg-[var(--accent-color)] text-white'
                                        : 'text-[var(--text-gray-color)] hover:text-[var(--text-color)]',
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)]">
                <div className="grid grid-cols-1 border-b border-[var(--border-color)] bg-[var(--bg-light-color)] sm:grid-cols-7">
                    {weekDayLabels.map((day) => (
                        <div
                            key={day}
                            className="hidden py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted-color)] sm:block"
                        >
                            {day}
                        </div>
                    ))}
                    <div className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted-color)] sm:hidden">
                        Schedule
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
                            <div
                                key={i}
                                className={cn(
                                    'relative flex flex-col gap-1.5 border-b border-[var(--border-color)] p-2.5 transition-colors hover:bg-[var(--bg-light-color)] sm:border-r',
                                    viewMode === 'month'
                                        ? 'min-h-[132px]'
                                        : 'min-h-[260px]',
                                    isToday &&
                                        'bg-[var(--accent-color)]/[0.04]',
                                    !dayObj.isCurrentMonth &&
                                        'hidden bg-[var(--overlay-color)] opacity-40 sm:flex',
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
                                                    ? 'shadow-[0_0_15px_var(--accent-color)]/30 bg-[var(--accent-color)] text-white'
                                                    : 'text-[var(--text-muted-color)]',
                                            )}
                                        >
                                            {dayObj.day}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted-color)] sm:hidden">
                                            {weekDayLabels[i % 7]}
                                        </span>
                                    </div>
                                    {dayIssues.length > 0 && (
                                        <span className="hidden text-[10px] font-bold text-[var(--text-muted-color)] 2xl:block">
                                            {dayIssues.length}{' '}
                                            {dayIssues.length === 1
                                                ? 'item'
                                                : 'items'}
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
                                            className={cn(
                                                'flex items-center rounded-r-md border-l-2 px-2 py-1.5 text-left transition-all sm:py-1',
                                                PRIORITY_CHIP_CLASSES[
                                                    issue.priority
                                                ],
                                            )}
                                        >
                                            <span className="truncate text-xs font-medium text-[var(--text-color)] sm:text-[11px]">
                                                {issue.title}
                                            </span>
                                        </motion.button>
                                    ))}
                                    {hiddenCount > 0 && (
                                        <span className="px-2 text-[10px] font-semibold text-[var(--text-muted-color)]">
                                            +{hiddenCount} more
                                        </span>
                                    )}
                                </div>
                            </div>
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
