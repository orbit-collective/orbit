import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import DatePickerOverlay from './DatePickerOverlay';

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert: vi.fn(),
        removeAlert: vi.fn(),
        alerts: [],
    }),
}));

describe('DatePickerOverlay Component', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('renders nothing when isOpen is false', () => {
        const { container } = render(
            <DatePickerOverlay
                isOpen={false}
                showStartDate
                showEndDate={false}
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('renders a single calendar when only showStartDate is true', () => {
        render(
            <DatePickerOverlay
                isOpen
                showStartDate
                showEndDate={false}
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        // Only one "Today"/"Close" pair should be present for a single calendar.
        expect(screen.getAllByText('Today')).toHaveLength(1);
        expect(screen.getAllByText('Close')).toHaveLength(1);
    });

    test('renders two calendars when both showStartDate and showEndDate are true', () => {
        render(
            <DatePickerOverlay
                isOpen
                showStartDate
                showEndDate
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        expect(screen.getAllByText('Today')).toHaveLength(2);
        expect(screen.getAllByText('Close')).toHaveLength(2);
    });

    test('renders no calendar when neither showStartDate nor showEndDate is true', () => {
        render(
            <DatePickerOverlay
                isOpen
                showStartDate={false}
                showEndDate={false}
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        expect(screen.queryByText('Today')).not.toBeInTheDocument();
    });

    test('parses the startDate string into the start calendar selection', () => {
        render(
            <DatePickerOverlay
                isOpen
                showStartDate
                showEndDate={false}
                startDate="2026-07-10"
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        const selectedButton = screen.getByText('10');
        expect(selectedButton).toHaveClass('bg-(--accent-color)');
    });

    test('parses the endDate string into the end calendar selection', () => {
        render(
            <DatePickerOverlay
                isOpen
                showStartDate={false}
                showEndDate
                endDate="2026-07-20"
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        const selectedButton = screen.getByText('20');
        expect(selectedButton).toHaveClass('bg-(--accent-color)');
    });

    test('calls onClose when the backdrop is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const { container } = render(
            <DatePickerOverlay
                isOpen
                showStartDate
                showEndDate={false}
                onClose={onClose}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        const backdrop = container.querySelector(
            '.backdrop-blur-\\[2px\\]',
        ) as HTMLElement;
        await user.click(backdrop);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('does not close when clicking inside the calendar panel', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <DatePickerOverlay
                isOpen
                showStartDate
                showEndDate={false}
                onClose={onClose}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        await user.click(screen.getByText('July 2026'));

        expect(onClose).not.toHaveBeenCalled();
    });

    test('calls onSelectStart when a day is picked in the start calendar', async () => {
        const user = userEvent.setup();
        const onSelectStart = vi.fn();
        render(
            <DatePickerOverlay
                isOpen
                showStartDate
                showEndDate={false}
                onClose={vi.fn()}
                onSelectStart={onSelectStart}
                onSelectEnd={vi.fn()}
            />,
        );

        await user.click(screen.getByText('12'));

        expect(onSelectStart).toHaveBeenCalledWith(new Date(2026, 6, 12));
    });

    test('calls onSelectEnd when a day is picked in the end calendar', async () => {
        const user = userEvent.setup();
        const onSelectEnd = vi.fn();
        render(
            <DatePickerOverlay
                isOpen
                showStartDate={false}
                showEndDate
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={onSelectEnd}
            />,
        );

        await user.click(screen.getByText('12'));

        expect(onSelectEnd).toHaveBeenCalledWith(new Date(2026, 6, 12));
    });

    test('passes startDate as the minDate/rangeStart of the end calendar', () => {
        render(
            <DatePickerOverlay
                isOpen
                showStartDate={false}
                showEndDate
                startDate="2026-07-15"
                onClose={vi.fn()}
                onSelectStart={vi.fn()}
                onSelectEnd={vi.fn()}
            />,
        );

        // Days before the start date should be disabled in the end calendar.
        const disabledDay = screen.getByText('10');
        expect(disabledDay).toHaveClass('cursor-not-allowed');
    });
});
