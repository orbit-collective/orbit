import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { bumpRefreshEpoch } from '@/utils/refreshEpoch';
import BarPlot from './BarPlot';

const bars = [
    {
        key: 'a',
        label: 'To do',
        heightPercent: 25,
        caption: '25%',
        tooltip: '181 issues',
    },
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
        expect(screen.getByRole('group')).toHaveAccessibleName(
            'Plot description',
        );
    });

    test('clamps heights into 0-100', () => {
        renderPlot();

        expect(
            screen
                .getAllByTestId('bar')
                .map((bar) => bar.dataset.heightPercent),
        ).toEqual(['25', '100', '0']);
    });

    test('non-empty bars keep a minimum height so a tiny share stays visible', () => {
        renderPlot();

        const [first, , third] = screen.getAllByTestId('bar');
        const motionBox = (bar: HTMLElement) =>
            bar.parentElement?.parentElement as HTMLElement;

        expect(motionBox(first).style.minHeight).toBe('0.75rem');
        expect(motionBox(third).style.minHeight).toBe('0px');
    });

    test('every bar is a labelled image the keyboard can reach', () => {
        renderPlot();

        const first = screen.getByRole('img', { name: 'To do: 181 issues' });
        expect(first).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('img', { name: 'Done: 74 of 100' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Empty: 0%' }),
        ).toBeInTheDocument();
    });

    test('hover and focus tooltips come from the Badge, opening upwards', () => {
        renderPlot();

        const tip = screen.getByText('181 issues');
        expect(tip.className).toContain('bottom-[calc(100%+6px)]');
        expect(tip.className).toContain('group-focus-within:opacity-100');
        expect(tip).toHaveAttribute('aria-hidden', 'true');
    });

    test('a bar without a tooltip has no tooltip element', () => {
        renderPlot();

        expect(
            screen
                .getByRole('img', { name: 'Empty: 0%' })
                .parentElement?.querySelectorAll('[aria-hidden="true"]'),
        ).toHaveLength(0);
    });

    test('highlights one bar and puts the dot on it', () => {
        renderPlot({ highlightKey: 'b' });

        expect(
            screen.getAllByTestId('bar').map((bar) => bar.dataset.highlighted),
        ).toEqual(['false', 'true', 'false']);
        expect(screen.getAllByTestId('highlight-dot')).toHaveLength(1);
    });

    test('shows captions under the x labels', () => {
        renderPlot();

        expect(
            screen.getByText('25%', { selector: 'span.block' }),
        ).toBeInTheDocument();
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

        expect(screen.getByTestId('marker-line')).toHaveAttribute(
            'data-percent',
            '60',
        );
        expect(screen.getByText('Avg 60%')).toBeInTheDocument();
    });

    test('uses a custom bar test id', () => {
        renderPlot({ barTestId: 'custom' });

        expect(screen.getAllByTestId('custom')).toHaveLength(3);
    });

    test('bars are rounded only on top, flat at the base', () => {
        renderPlot();

        screen.getAllByTestId('bar').forEach((bar) => {
            expect(bar).toHaveClass('rounded-t-full', 'rounded-none');
        });
    });

    test('bars carry the shared keyboard focus ring', () => {
        renderPlot();

        expect(screen.getAllByTestId('bar')[0].className).toContain(
            'focus-visible:ring-2',
        );
    });

    test('the marker is born at its final height, so it never climbs from the bottom', () => {
        render(
            <BarPlot
                bars={bars}
                ticks={ticks}
                ariaLabel="x"
                marker={{ percent: 74, label: '74%' }}
            />,
        );

        expect(screen.getByTestId('marker-line').style.bottom).toBe('74%');
    });

    test('the marker tag looks like the Badge tooltip', () => {
        render(
            <BarPlot
                bars={bars}
                ticks={ticks}
                ariaLabel="x"
                marker={{ percent: 74, label: '74%' }}
            />,
        );

        expect(screen.getByText('74%').className).toContain(
            'border-[var(--border-color)]',
        );
        expect(screen.getByText('74%').className).toContain(
            'bg-[var(--bg-color)]',
        );
    });

    test('every bar fills its own box, even a tiny one, so it sits on the baseline', () => {
        renderPlot();

        screen.getAllByTestId('bar').forEach((bar) => {
            expect(bar.parentElement).toHaveClass(
                'absolute',
                'inset-0',
                'h-full',
                'w-full',
            );
            expect(bar.parentElement).not.toHaveClass('w-fit');
        });
    });

    test('bars scroll and snap instead of squeezing, like the mobile board', () => {
        renderPlot();

        const scroller = screen.getByTestId('plot-scroller');
        expect(scroller).toHaveClass(
            'overflow-x-auto',
            'snap-x',
            'snap-mandatory',
            'no-scrollbar',
        );
        screen.getAllByTestId('plot-column').forEach((column) => {
            expect(column).toHaveClass('snap-center', 'min-w-[3.25rem]');
        });
    });

    test('the plot grows with the number of bars so none gets narrower than its column', () => {
        const many = Array.from({ length: 20 }, (_, i) => ({
            key: String(i),
            label: `bar ${i}`,
            heightPercent: 10 + i,
        }));
        const { rerender } = renderPlot();
        const few = parseFloat(
            screen.getByTestId('plot-content').style.minWidth,
        );

        rerender(<BarPlot bars={many} ticks={ticks} ariaLabel="many" />);

        expect(
            parseFloat(screen.getByTestId('plot-content').style.minWidth),
        ).toBeGreaterThan(few);
        expect(screen.getByTestId('plot-content').style.minWidth).toBe('67rem');
        expect(screen.getAllByTestId('plot-column')).toHaveLength(20);
    });

    test('the axis stays outside the scroller so it does not scroll away', () => {
        renderPlot({ marker: { percent: 50, label: 'Avg 50%' } });

        const axis = screen.getByTestId('plot-axis');
        expect(screen.getByTestId('plot-scroller').contains(axis)).toBe(false);
        expect(axis).toHaveTextContent('100%');
        expect(axis).toHaveTextContent('Avg 50%');
        expect(
            screen
                .getByTestId('plot-scroller')
                .contains(screen.getByTestId('marker-line')),
        ).toBe(true);
    });

    test('a refresh redraws the bars (new elements) but keeps the scroller itself', async () => {
        renderPlot();
        const scroller = screen.getByTestId('plot-scroller');
        const firstBar = screen.getAllByTestId('bar')[0];

        act(() => bumpRefreshEpoch());

        expect(screen.getByTestId('plot-scroller')).toBe(scroller);
        expect(screen.getAllByTestId('bar')[0]).not.toBe(firstBar);
        await waitFor(() =>
            expect(screen.getAllByTestId('bar')[0]).toBeVisible(),
        );
    });
});
