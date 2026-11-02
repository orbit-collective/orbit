import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { priorities } from '@/stories/fixtures';
import { todoStatus } from '@/tests/statuses';
import {
    DatePicker,
    PriorityPicker,
    StatusPicker,
} from './IssuePropertyPickers';

vi.mock('@/Components/Molecules/Calendar/Calendar', () => ({
    default: ({
        onSelect,
        minDate,
    }: {
        onSelect: (date: Date) => void;
        minDate?: Date;
    }) => (
        <button
            type="button"
            data-min={minDate?.getDate()}
            onClick={() => onSelect(new Date(2026, 10, 9))}
        >
            pick day
        </button>
    ),
}));

describe('StatusPicker', () => {
    test('is a dash without a status', () => {
        render(<StatusPicker statuses={[]} value={null} onChange={vi.fn()} />);

        expect(screen.getByText('—')).toBeInTheDocument();
    });

    test('is only the badge when disabled', () => {
        render(
            <StatusPicker
                statuses={[todoStatus]}
                value={todoStatus}
                disabled
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    });
});

describe('PriorityPicker', () => {
    test('reports null for "No priority"', () => {
        const onChange = vi.fn();
        render(
            <PriorityPicker
                priorities={priorities}
                value={priorities[0]}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByLabelText('Priority'));
        fireEvent.click(screen.getByText('No priority'));

        expect(onChange).toHaveBeenCalledWith(null);
    });
});

describe('DatePicker', () => {
    test('shows "No date" and opens the calendar, reporting a YYYY-MM-DD string', () => {
        const onChange = vi.fn();
        render(
            <DatePicker
                label="End date"
                value={null}
                minDate="2026-11-03"
                onChange={onChange}
            />,
        );

        expect(screen.getByText('No date')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('End date'));
        expect(screen.getByText('pick day')).toHaveAttribute('data-min', '3');
        fireEvent.click(screen.getByText('pick day'));

        expect(onChange).toHaveBeenCalledWith('2026-11-09');
        expect(screen.queryByText('pick day')).not.toBeInTheDocument();
    });

    test('is plain text when disabled', () => {
        render(
            <DatePicker
                label="Start date"
                value="2026-11-03"
                disabled
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByText(/3 Nov 2026/)).toBeInTheDocument();
        expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
    });
});
