import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ProductivityTrendProps } from '@/types/Issues';
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
        expect(bars[0].parentElement).toHaveAttribute('data-height', '100%');
        expect(bars[1].parentElement).toHaveAttribute('data-height', '50%');
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
        expect(tooltips[0].parentElement).toHaveAttribute(
            'data-height',
            '100%',
        );

        expect(tooltips[2]).toHaveTextContent('0');
        expect(tooltips[2].parentElement).toHaveAttribute(
            'data-height',
            '10px',
        );
    });

    test('highlights the bar for the current day of the week', () => {
        const { container } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        const bars = container.querySelectorAll(
            '.rounded-t-sm:not(.border-dashed)',
        );
        // Today is mocked to Monday, so only the "Mon" bar is highlighted.
        expect(bars[0]).toHaveAttribute('data-active', 'true');
        expect(bars[0]).toHaveStyle({ backgroundColor: 'var(--accent-color)' });
        expect(bars[1]).toHaveAttribute('data-active', 'false');
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

    test('every day column grows in, the baseline marker included', () => {
        const { container } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        const columns = container.querySelectorAll<HTMLElement>(
            '[data-testid="trend-column"]',
        );
        expect(columns).toHaveLength(trendData.length);
        expect(
            Array.from(columns).map((column) => column.dataset.height),
        ).toEqual(['100%', '50%', '10px']);
    });

    test('a column takes its new height when the data changes', () => {
        const { container, rerender } = render(
            <ProductivityTrendCard trendData={trendData} />,
        );

        rerender(
            <ProductivityTrendCard
                trendData={trendData.map((day) => ({
                    ...day,
                    count: day.count === 4 ? 4 : 1,
                }))}
            />,
        );

        const columns = container.querySelectorAll<HTMLElement>(
            '[data-testid="trend-column"]',
        );
        expect(columns[1].dataset.height).toBe('25%');
    });

    describe('variants and options', () => {
        test('the line variant draws a line with a point for every day', () => {
            render(
                <ProductivityTrendCard trendData={trendData} variant="line" />,
            );

            expect(screen.getByTestId('trend-line')).toBeInTheDocument();
            expect(screen.getAllByTestId('trend-point')).toHaveLength(3);
            expect(screen.queryAllByTestId('trend-column')).toHaveLength(0);
            // A line has no filled area under it.
            expect(screen.queryByTestId('trend-area')).not.toBeInTheDocument();
        });

        test('the area variant also fills under the line', () => {
            render(
                <ProductivityTrendCard trendData={trendData} variant="area" />,
            );

            expect(screen.getByTestId('trend-area')).toBeInTheDocument();
        });

        test('values can be shown all the time', () => {
            render(
                <ProductivityTrendCard trendData={trendData} values="always" />,
            );

            const label = screen
                .getAllByText('4')
                .find((el) => el.className.includes('scale-'));
            expect(label).toHaveClass('scale-100');
        });

        test('values are on hover by default', () => {
            render(<ProductivityTrendCard trendData={trendData} />);

            const label = screen
                .getAllByText('4')
                .find((el) => el.className.includes('scale-'));
            expect(label).toHaveClass('scale-0');
        });

        test('the title and the grid can be hidden', () => {
            const { container } = render(
                <ProductivityTrendCard
                    trendData={trendData}
                    showHeader={false}
                    showGrid={false}
                />,
            );

            expect(
                screen.queryByText('Productivity Trend'),
            ).not.toBeInTheDocument();
            expect(
                container.querySelectorAll('.border-dashed.border-t'),
            ).toHaveLength(0);
        });

        test('today is only highlighted when asked to', () => {
            const { container, rerender } = render(
                <ProductivityTrendCard trendData={trendData} />,
            );
            expect(
                container.querySelectorAll('[data-active="true"]'),
            ).toHaveLength(1);

            rerender(
                <ProductivityTrendCard
                    trendData={trendData}
                    highlightToday={false}
                />,
            );
            expect(
                container.querySelectorAll('[data-active="true"]'),
            ).toHaveLength(0);
        });

        test('the chart takes its color from the widget', () => {
            const { container } = render(
                <ProductivityTrendCard
                    trendData={trendData}
                    variant="line"
                    color="success"
                />,
            );

            expect(container.querySelector('path[stroke]')).toHaveAttribute(
                'stroke',
                'var(--success-color)',
            );
        });

        test('the bars of the current day take the color too', () => {
            const { container } = render(
                <ProductivityTrendCard trendData={trendData} color="warning" />,
            );

            expect(container.querySelector('[data-active="true"]')).toHaveStyle(
                { backgroundColor: 'var(--warning-color)' },
            );
        });

        test('two charts do not share the gradient of their area', () => {
            const { container } = render(
                <>
                    <ProductivityTrendCard
                        trendData={trendData}
                        variant="area"
                    />
                    <ProductivityTrendCard
                        trendData={trendData}
                        variant="area"
                    />
                </>,
            );

            const ids = [...container.querySelectorAll('linearGradient')].map(
                (gradient) => gradient.id,
            );
            expect(new Set(ids).size).toBe(2);
        });

        test('each point sits exactly where the line has its value', () => {
            render(
                <ProductivityTrendCard trendData={trendData} variant="line" />,
            );

            // The most is 4 and the axis ends at 4: Mon is at the top, Tue
            // halfway and Wed on the axis, like the line through them.
            const anchors = screen.getAllByTestId('trend-anchor');
            expect(anchors.map((anchor) => anchor.style.bottom)).toEqual([
                '100%',
                '50%',
                '0%',
            ]);
        });

        test('points are placed with plain offsets, not with transforms an animation could replace', () => {
            render(
                <ProductivityTrendCard trendData={trendData} variant="line" />,
            );

            for (const anchor of screen.getAllByTestId('trend-anchor')) {
                expect(anchor.className).not.toMatch(/translate/);
                expect(anchor.innerHTML).not.toMatch(/translate/);
            }
        });
    });
});
