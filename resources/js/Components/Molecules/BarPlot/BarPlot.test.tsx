import { render, screen } from '@testing-library/react';
import BarPlot from './BarPlot';

const bars = [
    { key: 'a', label: 'To do', heightPercent: 25, caption: '25%' },
    { key: 'b', label: 'Done', heightPercent: 140, tooltip: '74 of 100' },
    { key: 'c', label: 'Empty', heightPercent: 0 },
];
const ticks = [
    { percent: 0, label: '0%' },
    { percent: 50, label: '50%' },
    { percent: 100, label: '100%' },
];

const renderPlot = (props = {}) =>
    render(
        <BarPlot
            bars={bars}
            ticks={ticks}
            ariaLabel="Plot description"
            {...props}
        />,
    );

describe('BarPlot', () => {
    test('draws a bar and an x label per entry and a label per tick', () => {
        renderPlot();

        expect(screen.getAllByTestId('bar')).toHaveLength(3);
        expect(screen.getByText('To do')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAccessibleName(
            'Plot description',
        );
    });

    test('clamps heights into 0-100 and gives non-empty bars a minimum', () => {
        renderPlot();

        const [first, second, third] = screen.getAllByTestId('bar');
        expect(first.style.height).toBe('25%');
        expect(second.style.height).toBe('100%');
        expect(third.style.height).toBe('0%');
        expect(first.style.minHeight).toBe('0.75rem');
        expect(third.style.minHeight).toBe('0px');
    });

    test('highlights one bar and puts the dot on it', () => {
        renderPlot({ highlightKey: 'b' });

        expect(
            screen
                .getAllByTestId('bar')
                .map((bar) => (bar as HTMLElement).dataset.highlighted),
        ).toEqual(['false', 'true', 'false']);
        expect(
            screen.getAllByTestId('bar')[1].querySelectorAll('span'),
        ).toHaveLength(1);
        expect(screen.getAllByTestId('highlight-dot')).toHaveLength(1);
    });

    test('shows captions and hover tooltips', () => {
        renderPlot();

        expect(
            screen.getByText('25%', { selector: 'span.absolute' }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('74 of 100').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('bar')[1]).toHaveAttribute(
            'title',
            '74 of 100',
        );
    });

    test('draws the marker line with its tag only when asked', () => {
        const { rerender } = renderPlot();
        expect(screen.queryByTestId('marker-line')).not.toBeInTheDocument();

        rerender(
            <BarPlot
                bars={bars}
                ticks={ticks}
                ariaLabel="x"
                marker={{ percent: 60, label: 'Avg 60%' }}
            />,
        );

        expect(screen.getByTestId('marker-line').style.bottom).toBe('60%');
        expect(screen.getByText('Avg 60%')).toBeInTheDocument();
    });

    test('uses a custom bar test id', () => {
        renderPlot({ barTestId: 'custom' });

        expect(screen.getAllByTestId('custom')).toHaveLength(3);
    });

    test('bars are rounded only on top, flat at the base', () => {
        renderPlot();

        screen.getAllByTestId('bar').forEach((bar) => {
            expect(bar).toHaveClass('rounded-t-full', 'rounded-b-none');
        });
    });
});
