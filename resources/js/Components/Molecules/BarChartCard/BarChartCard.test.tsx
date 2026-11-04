import { render, screen } from '@testing-library/react';
import BarChartCard, { niceMax } from './BarChartCard';

const items = [
    { key: 'a', label: 'app', value: 2 },
    { key: 'b', label: 'queue', value: 8, valueLabel: '8h' },
    { key: 'c', label: 'redis', value: 5 },
];

describe('niceMax', () => {
    test.each([
        [0, 1],
        [3, 5],
        [8, 10],
        [11, 20],
        [230, 250],
        [0.4, 0.5],
    ])('rounds %s up to %s', (input, expected) => {
        expect(niceMax(input)).toBeCloseTo(expected);
    });
});

describe('BarChartCard', () => {
    test('renders a bar and a label per item', () => {
        render(<BarChartCard title="Uptime" icon="Activity" items={items} />);

        expect(screen.getByText('Uptime')).toBeInTheDocument();
        expect(screen.getAllByTestId('bar')).toHaveLength(3);
        expect(screen.getByText('queue')).toBeInTheDocument();
    });

    test('highlights only the largest bar', () => {
        render(<BarChartCard title="Uptime" icon="Activity" items={items} />);

        const bars = screen.getAllByTestId('bar');
        expect(bars.map((bar) => bar.dataset.highlighted)).toEqual([
            'false',
            'true',
            'false',
        ]);
    });

    test('shows the average with the supplied formatter', () => {
        render(
            <BarChartCard
                title="Uptime"
                icon="Activity"
                items={items}
                formatValue={(value) => `${Math.round(value)}h`}
            />,
        );

        expect(screen.getByText('Avg 5h')).toBeInTheDocument();
    });

    test('prefers the item valueLabel in the tooltip', () => {
        render(<BarChartCard title="Uptime" icon="Activity" items={items} />);

        expect(screen.getByText('8h')).toBeInTheDocument();
    });

    test('renders the summary slot', () => {
        render(
            <BarChartCard
                title="Uptime"
                icon="Activity"
                items={items}
                summary={<span>Total: 15</span>}
            />,
        );

        expect(screen.getByText('Total: 15')).toBeInTheDocument();
    });

    test('shows the empty text instead of a chart', () => {
        render(
            <BarChartCard
                title="Uptime"
                icon="Activity"
                items={[]}
                emptyText="No containers"
            />,
        );

        expect(screen.getByText('No containers')).toBeInTheDocument();
        expect(screen.queryByTestId('bar')).not.toBeInTheDocument();
    });

    test('describes the chart for assistive technology', () => {
        render(<BarChartCard title="Uptime" icon="Activity" items={items} />);

        expect(screen.getByRole('img')).toHaveAccessibleName(
            'Uptime: app 2, queue 8h, redis 5',
        );
    });
});
