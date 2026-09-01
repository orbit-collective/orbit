import Icon from '@/Components/Atoms/Icon/Icon';
import { CalendarViewProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

const MAX_VISIBLE_ISSUES_PER_DAY = 3;

const PRIORITY_CHIP_CLASSES: Record<Issue['priority'], string> = {
    high: 'border-l-[var(--error-color)] bg-[var(--error-color)]/10 hover:bg-[var(--error-color)]/15',
    medium: 'border-l-[var(--warning-color)] bg-[var(--warning-color)]/10 hover:bg-[var(--warning-color)]/15',
    low: 'border-l-[var(--success-color)] bg-[var(--success-color)]/10 hover:bg-[var(--success-color)]/15',
};

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Parses a "YYYY-MM-DD" string as local-time date components, avoiding the
 * UTC-midnight-shifts-a-day-back pitfall of `new Date("YYYY-MM-DD")`. */
const parseDateKey = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const CalendarView: React.FC<CalendarViewProps> = ({ issues }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthNames = [
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

    const daysInMonth = (year: number, month: number) =>
        new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) =>
        new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const calendarDays = useMemo(() => {
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

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    return (
        <div className="flex h-full flex-col p-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-[var(--text-color)]">
                        {monthNames[month]}{' '}
                        <span className="font-medium text-[var(--text-muted-color)]">
                            {year}
                        </span>
                    </h2>
                    <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-light-color)] p-1">
                        <button
                            onClick={prevMonth}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-all hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)]"
                        >
                            <Icon name="ChevronLeft" size={18} />
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-3 py-1 text-xs font-semibold text-[var(--text-gray-color)] transition-all hover:text-[var(--text-color)]"
                        >
                            Today
                        </button>
                        <button
                            onClick={nextMonth}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-all hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)]"
                        >
                            <Icon name="ChevronRight" size={18} />
                        </button>
                    </div>
                </div>

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
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)]">
                <div className="grid grid-cols-1 border-b border-[var(--border-color)] bg-[var(--bg-light-color)] sm:grid-cols-7">
                    {weekDays.map((day) => (
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
                    {calendarDays.map((dayObj, i) => {
                        const dayIssues = issuesByDate[dayObj.dateKey] || [];
                        const visibleIssues = dayIssues.slice(
                            0,
                            MAX_VISIBLE_ISSUES_PER_DAY,
                        );
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
                                    'relative flex min-h-[132px] flex-col gap-1.5 border-b border-[var(--border-color)] p-2.5 transition-colors hover:bg-[var(--bg-light-color)] sm:border-r',
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
                                            {weekDays[i % 7]}
                                        </span>
                                    </div>
                                    {dayIssues.length > 0 && (
                                        <span className="text-[10px] font-bold text-[var(--text-muted-color)]">
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
        </div>
    );
};

export default CalendarView;
