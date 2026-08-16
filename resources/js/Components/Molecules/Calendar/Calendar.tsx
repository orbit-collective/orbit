import Icon from '@/Components/Atoms/Icon/Icon';
import { useAlert } from '@/context/AlertContext';
import { motion } from 'framer-motion';
import React, { useState } from 'react';

interface CalendarProps {
    selectedDate?: Date;
    onSelect: (date: Date) => void;
    onClose: () => void;
    minDate?: Date;
    rangeStart?: Date;
}

const Calendar: React.FC<CalendarProps> = ({
    selectedDate,
    onSelect,
    onClose,
    minDate,
    rangeStart,
}) => {
    const [currentMonth, setCurrentMonth] = useState(
        selectedDate || new Date(),
    );
    const { addAlert } = useAlert();

    const daysInMonth = (year: number, month: number) =>
        new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) =>
        new Date(year, month, 1).getDay();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const days = [];
    const prevMonthDays = daysInMonth(year, month - 1);
    const firstDay = firstDayOfMonth(year, month);

    // Add days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
            day: prevMonthDays - i,
            month: month - 1,
            year: year,
            currentMonth: false,
        });
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth(year, month); i++) {
        days.push({
            day: i,
            month: month,
            year: year,
            currentMonth: true,
        });
    }

    // Add days from next month
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
        days.push({
            day: i,
            month: month + 1,
            year: year,
            currentMonth: false,
        });
    }

    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));

    const isSelected = (d: number, m: number, y: number) => {
        if (!selectedDate) return false;
        return (
            selectedDate.getDate() === d &&
            selectedDate.getMonth() === m &&
            selectedDate.getFullYear() === y
        );
    };

    const isToday = (d: number, m: number, y: number) => {
        const today = new Date();
        return (
            today.getDate() === d &&
            today.getMonth() === m &&
            today.getFullYear() === y
        );
    };

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

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
                duration: 0.2,
                type: 'spring',
                damping: 25,
                stiffness: 300,
            }}
            className="w-[320px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark-color)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
            <div className="mb-6 flex items-center justify-between">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                >
                    <Icon name="ChevronLeft" size={16} />
                </button>
                <span className="text-sm font-semibold text-[var(--text-color)]">
                    {monthNames[month]} {year}
                </span>
                <button
                    type="button"
                    onClick={nextMonth}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                >
                    <Icon name="ChevronRight" size={16} />
                </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <span
                        key={day}
                        className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-gray-color)]"
                    >
                        {day}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {days.map((dateObj, i) => {
                    const selected = isSelected(
                        dateObj.day,
                        dateObj.month,
                        dateObj.year,
                    );
                    const today = isToday(
                        dateObj.day,
                        dateObj.month,
                        dateObj.year,
                    );

                    const isBeforeMinDate = () => {
                        if (!minDate) return false;
                        // Create a date object for the day being rendered
                        const date = new Date(
                            dateObj.year,
                            dateObj.month,
                            dateObj.day,
                        );
                        // Create a date object for minDate normalized to midnight
                        const min = new Date(
                            minDate.getFullYear(),
                            minDate.getMonth(),
                            minDate.getDate(),
                        );
                        return date < min;
                    };

                    const isInRange = () => {
                        if (!rangeStart || !selectedDate) return false;
                        const date = new Date(
                            dateObj.year,
                            dateObj.month,
                            dateObj.day,
                        );
                        const start = new Date(
                            rangeStart.getFullYear(),
                            rangeStart.getMonth(),
                            rangeStart.getDate(),
                        );
                        const end = new Date(
                            selectedDate.getFullYear(),
                            selectedDate.getMonth(),
                            selectedDate.getDate(),
                        );
                        return date >= start && date <= end;
                    };

                    const isRangeStart = () => {
                        if (!rangeStart) return false;
                        return (
                            rangeStart.getDate() === dateObj.day &&
                            rangeStart.getMonth() === dateObj.month &&
                            rangeStart.getFullYear() === dateObj.year
                        );
                    };

                    const isRangeEnd = () => {
                        if (!selectedDate) return false;
                        return (
                            selectedDate.getDate() === dateObj.day &&
                            selectedDate.getMonth() === dateObj.month &&
                            selectedDate.getFullYear() === dateObj.year
                        );
                    };

                    const disabled = isBeforeMinDate();
                    const inRange = isInRange();
                    const rangeStartNode = isRangeStart();
                    const rangeEndNode = isRangeEnd();

                    return (
                        <div
                            key={i}
                            className="relative flex items-center justify-center py-1"
                        >
                            {inRange && (
                                <div
                                    className={`absolute z-0 h-9 w-full bg-[var(--bg-light-color)] ${rangeStartNode || i % 7 === 0 ? 'rounded-l-xl' : ''} ${rangeEndNode || i % 7 === 6 ? 'rounded-r-xl' : ''} `}
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (disabled) {
                                        addAlert(
                                            'This date is not selectable.',
                                            'error',
                                        );
                                        return;
                                    } else {
                                        addAlert(
                                            'Date selected successfully.',
                                            'success',
                                        );
                                    }
                                    onSelect(
                                        new Date(
                                            dateObj.year,
                                            dateObj.month,
                                            dateObj.day,
                                        ),
                                    );
                                }}
                                className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-xl text-[13px] transition-all duration-200 ${!dateObj.currentMonth ? 'opacity-20' : 'text-[var(--text-color)]'} ${selected ? 'bg-[var(--accent-color)] font-bold !text-white !opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.4)]' : inRange ? 'text-[var(--accent-color)]' : 'hover:bg-[var(--bg-light-color)]'} ${today && !selected ? 'border border-[var(--accent-color)]' : 'border border-transparent'} ${disabled ? 'cursor-not-allowed opacity-5 grayscale' : 'cursor-pointer'} `}
                            >
                                {dateObj.day}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex justify-between border-t border-[var(--bg-light-color)] pt-3">
                <button
                    type="button"
                    onClick={() => {
                        onSelect(new Date());
                    }}
                    className="cursor-pointer text-[11px] font-medium text-[var(--accent-color)] hover:underline"
                >
                    Today
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer text-[11px] font-medium text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                >
                    Close
                </button>
            </div>
        </motion.div>
    );
};

export default Calendar;
