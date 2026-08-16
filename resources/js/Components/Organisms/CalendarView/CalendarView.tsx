import Icon from '@/Components/Atoms/Icon/Icon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { CalendarViewProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

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
        issues.forEach((issue) => {
            if (issue.start_date) {
                const date = issue.start_date;
                if (!map[date]) map[date] = [];
                map[date].push(issue);
            }
        });
        return map;
    }, [issues]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    return (
        <div className="flex h-full flex-col bg-[var(--bg-color)] p-6">
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
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] backdrop-blur-sm">
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
                                    'relative flex flex-col gap-1 border-b border-[var(--border-color)] p-2 transition-colors hover:bg-[var(--bg-light-color)] sm:border-r',
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

                                <div className="no-scrollbar flex flex-col gap-1 overflow-y-auto sm:max-h-[100px]">
                                    {dayIssues.map((issue) => (
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
                                                'hover:border-[var(--accent-color)]/50 group flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-light-color)] p-1.5 text-left transition-all hover:bg-[var(--bg-light-color-hover)] sm:p-1.5',
                                                'px-3 py-2.5 sm:px-1.5 sm:py-1.5', // Larger on mobile
                                            )}
                                        >
                                            <StatusDot
                                                status={issue.priority}
                                                size="xs"
                                            />
                                            <span className="truncate text-xs font-medium text-[var(--text-color)] group-hover:text-[var(--text-color)] sm:text-[11px]">
                                                {issue.title}
                                            </span>
                                        </motion.button>
                                    ))}
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
