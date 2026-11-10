import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import WeekSummaryCard from './WeekSummaryCard';

const trend = [
    { day: 'Mon', count: 4 },
    { day: 'Tue', count: 9 },
    { day: 'Wed', count: 0 },
    { day: 'Thu', count: 2 },
];

const base = { trend, todayName: 'Tue' };

describe('WeekSummaryCard', () => {
    test('is titled and says what it counts', () => {
        render(<WeekSummaryCard {...base} />);

        expect(screen.getByText('Week Summary')).toBeInTheDocument();
        expect(
            screen.getByText('Issue updates and fixes this week'),
        ).toBeInTheDocument();
    });

    test('can leave its title out', () => {
        render(<WeekSummaryCard {...base} showHeader={false} />);

        expect(screen.queryByText('Week Summary')).not.toBeInTheDocument();
    });

    describe('as numbers', () => {
        test('gives the total, today, the daily average and the best day as terms with their values', () => {
            render(<WeekSummaryCard {...base} />);

            const value = (term: string) =>
                screen.getByText(term).nextElementSibling;
            expect(value('Total')).toHaveTextContent('15');
            expect(value('Today')).toHaveTextContent('9');
            expect(value('Daily average')).toHaveTextContent('3.8');
            expect(value('Best day')).toHaveTextContent('9');
            expect(value('Best day')).toHaveTextContent('Tue');
        });

        test('leaves out the average and the best day when asked to', () => {
            render(
                <WeekSummaryCard
                    {...base}
                    showAverage={false}
                    showBest={false}
                />,
            );

            expect(screen.queryByText('Daily average')).not.toBeInTheDocument();
            expect(screen.queryByText('Best day')).not.toBeInTheDocument();
            expect(screen.getByText('Total')).toBeInTheDocument();
        });

        test('says there is no best day in a quiet week', () => {
            render(
                <WeekSummaryCard
                    trend={[{ day: 'Mon', count: 0 }]}
                    todayName="Mon"
                />,
            );

            expect(screen.getByText('None')).toBeInTheDocument();
        });
    });

    describe('as a sparkline', () => {
        test('draws the week as a picture that says every day', () => {
            render(<WeekSummaryCard {...base} variant="sparkline" />);

            expect(
                screen.getByRole('img', {
                    name: 'Updates per day: Mon 4, Tue 9, Wed 0, Thu 2',
                }),
            ).toBeInTheDocument();
        });

        test('writes the average and the best day beside the total', () => {
            render(<WeekSummaryCard {...base} variant="sparkline" />);

            expect(screen.getByText('3.8 a day')).toBeInTheDocument();
            expect(screen.getByText('Best: Tue (9)')).toBeInTheDocument();
        });

        test('leaves them out when asked to', () => {
            render(
                <WeekSummaryCard
                    {...base}
                    variant="sparkline"
                    showAverage={false}
                    showBest={false}
                />,
            );

            expect(screen.queryByText('3.8 a day')).not.toBeInTheDocument();
            expect(screen.queryByText(/Best:/)).not.toBeInTheDocument();
        });

        test('copes with a single day', () => {
            render(
                <WeekSummaryCard
                    trend={[{ day: 'Mon', count: 3 }]}
                    todayName="Mon"
                    variant="sparkline"
                />,
            );

            expect(screen.getByRole('img')).toBeInTheDocument();
        });

        test('takes the color of the widget', () => {
            const { container } = render(
                <WeekSummaryCard
                    {...base}
                    variant="sparkline"
                    color="success"
                />,
            );

            expect(container.querySelector('path[stroke]')).toHaveAttribute(
                'stroke',
                'var(--success-color)',
            );
        });

        test('gives each sparkline its own gradient', () => {
            const { container } = render(
                <>
                    <WeekSummaryCard {...base} variant="sparkline" />
                    <WeekSummaryCard {...base} variant="sparkline" />
                </>,
            );

            const ids = [...container.querySelectorAll('linearGradient')].map(
                (g) => g.id,
            );
            expect(new Set(ids).size).toBe(2);
        });
    });

    describe('as bars', () => {
        test('has a bar for each day, sized by its count, in a list that says every day', () => {
            render(<WeekSummaryCard {...base} variant="bars" />);

            const list = screen.getByRole('list', {
                name: 'Updates per day: Mon 4, Tue 9, Wed 0, Thu 2',
            });
            const bars = within(list).getAllByTestId('week-bar');
            expect(bars.map((bar) => bar.getAttribute('data-count'))).toEqual([
                '4',
                '9',
                '0',
                '2',
            ]);
        });

        test('spells out a day for assistive technology behind its initial', () => {
            render(<WeekSummaryCard {...base} variant="bars" />);

            expect(screen.getByText('on')).toHaveClass('sr-only');
        });

        test('marks today and the best day with the color', () => {
            render(
                <WeekSummaryCard {...base} variant="bars" todayName="Mon" />,
            );

            const bars = screen.getAllByTestId('week-bar');
            // Monday is today, Tuesday is the best day: both are tinted, the others are not.
            expect(bars[0].getAttribute('style')).toContain('background-color');
            expect(bars[1].getAttribute('style')).toContain('background-color');
            expect(bars[3].getAttribute('style') ?? '').not.toContain(
                'background-color',
            );
        });

        test('does not mark the best day when asked not to', () => {
            render(
                <WeekSummaryCard
                    {...base}
                    variant="bars"
                    todayName="Mon"
                    showBest={false}
                />,
            );

            expect(
                screen.getAllByTestId('week-bar')[1].getAttribute('style') ??
                    '',
            ).not.toContain('background-color');
        });
    });

    describe('hover labels', () => {
        test('every bar names its day and count on hover', () => {
            render(<WeekSummaryCard {...base} variant="bars" />);

            expect(screen.getByText('Mon: 4 updates')).toBeInTheDocument();
            expect(screen.getByText('Wed: 0 updates')).toBeInTheDocument();
        });

        test('the sparkline has one hover column per day, with a singular for one', () => {
            render(
                <WeekSummaryCard
                    trend={[
                        { day: 'Mon', count: 1 },
                        { day: 'Tue', count: 3 },
                    ]}
                    todayName="Tue"
                    variant="sparkline"
                />,
            );

            // The guide and the label stand on the points of the line: the first
            // day at the left edge and the last at the right one.
            const [first, last] = screen.getAllByTestId('week-hover');
            const lefts = (cell: HTMLElement) =>
                [...cell.querySelectorAll<HTMLElement>('span')].map(
                    (span) => span.style.left,
                );
            expect(lefts(first)).toEqual(['0%', '0%', '0%']);
            expect(lefts(last)).toEqual(['100%', '100%', '100%']);
            expect(screen.getAllByTestId('week-hover')).toHaveLength(2);
            expect(screen.getByText('Mon: 1 update')).toBeInTheDocument();
            expect(screen.getByText('Tue: 3 updates')).toBeInTheDocument();
        });
    });
});
