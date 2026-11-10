import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Calendar from './Calendar';

const mockAddAlert = vi.hoisted(() => vi.fn());

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert: mockAddAlert,
        removeAlert: vi.fn(),
        alerts: [],
    }),
}));

describe('Calendar Component', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
        mockAddAlert.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('renders the current month and year when no selected date is given', () => {
        render(<Calendar onSelect={vi.fn()} onClose={vi.fn()} />);

        expect(screen.getByText('July 2026')).toBeInTheDocument();
    });

    test('renders the month/year of the selected date instead of today', () => {
        render(
            <Calendar
                selectedDate={new Date(2026, 2, 15)}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        expect(screen.getByText('March 2026')).toBeInTheDocument();
    });

    test('renders all weekday headers', () => {
        render(<Calendar onSelect={vi.fn()} onClose={vi.fn()} />);

        ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach((day) => {
            expect(screen.getByText(day)).toBeInTheDocument();
        });
    });

    test('renders the correct number of days for the pinned month', () => {
        render(<Calendar onSelect={vi.fn()} onClose={vi.fn()} />);

        // July 2026 has 31 days.
        for (let day = 1; day <= 31; day++) {
            expect(
                screen.getAllByText(day.toString()).length,
            ).toBeGreaterThanOrEqual(1);
        }
    });

    test('highlights today with a bordered button', () => {
        render(<Calendar onSelect={vi.fn()} onClose={vi.fn()} />);

        const todayButton = screen.getByText('25');
        expect(todayButton).toHaveClass('border-(--accent-color)');
    });

    test('highlights the selected date with the accent background', () => {
        render(
            <Calendar
                selectedDate={new Date(2026, 6, 10)}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        const selectedButton = screen.getByText('10');
        expect(selectedButton).toHaveClass('bg-(--accent-color)');
    });

    test('navigates to the next month when the next-month button is clicked', async () => {
        const user = userEvent.setup();
        render(<Calendar onSelect={vi.fn()} onClose={vi.fn()} />);

        expect(screen.getByText('July 2026')).toBeInTheDocument();

        const nextButton = document
            .querySelector('.lucide-chevron-right')
            ?.closest('button') as HTMLElement;
        await user.click(nextButton);

        expect(screen.getByText('August 2026')).toBeInTheDocument();
    });

    test('navigates to the previous month when the prev-month button is clicked', async () => {
        const user = userEvent.setup();
        render(<Calendar onSelect={vi.fn()} onClose={vi.fn()} />);

        expect(screen.getByText('July 2026')).toBeInTheDocument();

        const prevButton = document
            .querySelector('.lucide-chevron-left')
            ?.closest('button') as HTMLElement;
        await user.click(prevButton);

        expect(screen.getByText('June 2026')).toBeInTheDocument();
    });

    test('calls onSelect with the clicked date and shows a success alert', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<Calendar onSelect={onSelect} onClose={vi.fn()} />);

        await user.click(screen.getByText('15'));

        expect(onSelect).toHaveBeenCalledWith(new Date(2026, 6, 15));
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Date selected successfully.',
            'success',
        );
    });

    test('does not call onSelect and shows an error alert for a date before minDate', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <Calendar
                onSelect={onSelect}
                onClose={vi.fn()}
                minDate={new Date(2026, 6, 15)}
            />,
        );

        await user.click(screen.getByText('10'));

        expect(onSelect).not.toHaveBeenCalled();
        expect(mockAddAlert).toHaveBeenCalledWith(
            'This date is not selectable.',
            'error',
        );
    });

    test('disables the button for dates before minDate', () => {
        render(
            <Calendar
                onSelect={vi.fn()}
                onClose={vi.fn()}
                minDate={new Date(2026, 6, 15)}
            />,
        );

        const disabledDay = screen.getByText('10');
        expect(disabledDay).toHaveClass('cursor-not-allowed');
    });

    test('selects today when the "Today" shortcut is clicked', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<Calendar onSelect={onSelect} onClose={vi.fn()} />);

        await user.click(screen.getByText('Today'));

        expect(onSelect).toHaveBeenCalledWith(new Date());
    });

    test('calls onClose when the "Close" shortcut is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<Calendar onSelect={vi.fn()} onClose={onClose} />);

        await user.click(screen.getByText('Close'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('marks days within the selected range when rangeStart and selectedDate are provided', () => {
        render(
            <Calendar
                selectedDate={new Date(2026, 6, 20)}
                rangeStart={new Date(2026, 6, 10)}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        const midRangeDay = screen.getByText('15');
        expect(midRangeDay).toHaveClass('text-(--accent-color)');
    });
});
