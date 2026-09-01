import { ProductivityTrendProps } from '@/types/Issues';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ProductivityTrendCard } from './ProductivityTrendCard';

describe('ProductivityTrendCard Component', () => {
    beforeEach(() => {
        // Pin "today" to Monday 2024-01-01 so the active-day logic is deterministic.
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T12:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const trendData: ProductivityTrendProps[] = [
        { day: 'Mon', count: 4 },
        { day: 'Tue', count: 2 },
        { day: 'Wed', count: 0 },
    ];

    test('renders the card title and description', () => {
        render(<ProductivityTrendCard trendData={trendData} />);

        expect(screen.getByText('Productivity Trend')).toBeInTheDocument();
        expect(
            screen.getByText('Daily issue updates and fixes from this week'),
        ).toBeInTheDocument();
    });

    test('renders a labelled bar for each day', () => {
        render(<ProductivityTrendCard trendData={trendData} />);

        expect(screen.getByText('Mon')).toBeInTheDocument();
        expect(screen.getByText('Tue')).toBeInTheDocument();
        expect(screen.getByText('Wed')).toBeInTheDocument();
    });

    test('scales bar heights relative to the axis maximum', () => {
        const { container } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        const bars = container.querySelectorAll(
            '.rounded-t-sm:not(.border-dashed)',
        );
        // max count is 4, which rounds up to a nice axis max of 4 => Mon 100%, Tue 50%.
        // The height is set on each bar's wrapper (which also anchors its tooltip).
        expect(bars).toHaveLength(2);
        expect(bars[0].parentElement).toHaveStyle({ height: '100%' });
        expect(bars[1].parentElement).toHaveStyle({ height: '50%' });
    });

    test('renders a hollow dashed marker instead of an invisible bar for a zero-count day', () => {
        const { container } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        // Wed has a count of 0, so it gets a dashed placeholder bar rather than a 0-height one.
        const solidBars = container.querySelectorAll(
            '.rounded-t-sm:not(.border-dashed)',
        );
        const zeroMarkers = container.querySelectorAll(
            '.rounded-t-sm.border-dashed',
        );
        expect(solidBars).toHaveLength(2);
        expect(zeroMarkers).toHaveLength(1);
    });

    test('positions the count tooltip at the top of the bar it belongs to, not the column', () => {
        const { container } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        // Mon (100% bar) sits in a full-height wrapper; Wed (zero) sits in a
        // short, fixed-height wrapper so its tooltip floats near the baseline.
        const tooltips = container.querySelectorAll('.scale-0');
        expect(tooltips[0]).toHaveTextContent('4');
        expect(tooltips[0].parentElement).toHaveStyle({ height: '100%' });

        expect(tooltips[2]).toHaveTextContent('0');
        expect(tooltips[2].parentElement).toHaveStyle({ height: '10px' });
    });

    test('highlights the bar for the current day of the week', () => {
        const { container } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        const bars = container.querySelectorAll(
            '.rounded-t-sm:not(.border-dashed)',
        );
        // Today is mocked to Monday, so only the "Mon" bar is highlighted.
        expect(bars[0]).toHaveClass('bg-[var(--accent-color)]');
        expect(bars[1]).not.toHaveClass('bg-[var(--accent-color)]');
    });

    test('renders a nice-rounded y-axis with gridlines', () => {
        const { container } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        // max count 4 => ticks 4, 3, 2, 1, 0
        const axis = container.querySelector('.tabular-nums');
        expect(axis).toHaveTextContent('43210');
        expect(
            container.querySelectorAll('.border-t.border-dashed'),
        ).toHaveLength(5);
    });

    test('shows an empty state instead of a flat chart when there is no activity', () => {
        const zeroData: ProductivityTrendProps[] = [
            { day: 'Mon', count: 0 },
            { day: 'Tue', count: 0 },
        ];
        const { container } = render(
            <ProductivityTrendCard trendData={zeroData} />,
        );

        expect(
            screen.getByText('No activity yet this week'),
        ).toBeInTheDocument();
        expect(container.querySelectorAll('.rounded-t-sm')).toHaveLength(0);
    });
});
