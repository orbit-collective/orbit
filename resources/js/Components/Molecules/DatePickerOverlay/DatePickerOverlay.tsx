import { AnimatePresence } from 'framer-motion';
import React from 'react';
import Calendar from '../Calendar/Calendar';

interface DatePickerOverlayProps {
    isOpen: boolean;
    showStartDate: boolean;
    showEndDate: boolean;
    startDate?: string;
    endDate?: string;
    onClose: () => void;
    onSelectStart: (date: Date) => void;
    onSelectEnd: (date: Date) => void;
}

const DatePickerOverlay: React.FC<DatePickerOverlayProps> = ({
    isOpen,
    showStartDate,
    showEndDate,
    startDate,
    endDate,
    onClose,
    onSelectStart,
    onSelectEnd,
}) => {
    const toDate = (dateStr?: string) => {
        if (!dateStr) return undefined;
        return new Date(dateStr.replace(/-/g, '/'));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="absolute inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-color)] backdrop-blur-[2px]"
                    onClick={onClose}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        {showStartDate && (
                            <Calendar
                                selectedDate={toDate(startDate)}
                                onSelect={onSelectStart}
                                onClose={onClose}
                            />
                        )}
                        {showEndDate && (
                            <Calendar
                                selectedDate={toDate(endDate)}
                                minDate={toDate(startDate)}
                                rangeStart={toDate(startDate)}
                                onSelect={onSelectEnd}
                                onClose={onClose}
                            />
                        )}
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DatePickerOverlay;
