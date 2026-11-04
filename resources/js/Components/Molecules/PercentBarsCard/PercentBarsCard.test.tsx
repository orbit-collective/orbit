import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PercentBarsCard from './PercentBarsCard';

const bars = [
    { key: 'todo', label: 'To do', percent: 20 },
    { key: 'in_progress', label: 'In progress', percent: 69 },
    { key: 'done', label: 'Done', percent: 11 },
];

const renderCard = (props = {}) =>
    render(
        <PercentBarsCard
            title="Issues by status"
            icon="ChartColumn"
            total="128"
            totalLabel="Total issues"
            bars={bars}
            {...props}
        />,
    );

describe('PercentBarsCard', () => {
    test('shows the total and one bar per entry', () => {
        renderCard();

        expect(screen.getByTestId('total')).toHaveTextContent('128');
        expect(screen.getAllByTestId('percent-bar')).toHaveLength(3);
        expect(screen.getByText('In progress')).toBeInTheDocument();
    });

    test('sizes bars by their percent', () => {
        renderCard();

        const heights = screen
            .getAllByTestId('percent-bar')
            .map((bar) => (bar as HTMLElement).style.height);
        expect(heights).toEqual(['20%', '69%', '11%']);
    });

    test('highlights the largest bar by default', () => {
        renderCard();

        expect(
            screen
                .getAllByTestId('percent-bar')
                .map((bar) => (bar as HTMLElement).dataset.highlighted),
        ).toEqual(['false', 'true', 'false']);
    });

    test('highlightKey overrides the largest', () => {
        renderCard({ highlightKey: 'done' });

        expect(
            screen
                .getAllByTestId('percent-bar')
                .map((bar) => (bar as HTMLElement).dataset.highlighted),
        ).toEqual(['false', 'false', 'true']);
    });

    test('clamps out-of-range percents', () => {
        renderCard({
            bars: [{ key: 'a', label: 'A', percent: 140 }],
        });

        expect(
            (screen.getByTestId('percent-bar') as HTMLElement).style.height,
        ).toBe('100%');
    });

    test('renders trend, footnote and a chart description', () => {
        renderCard({
            trend: { value: 15.78 },
            footnote: 'Most issues are in progress',
        });

        expect(screen.getByText('15.78%')).toBeInTheDocument();
        expect(
            screen.getByText('Most issues are in progress'),
        ).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAccessibleName(
            'Issues by status: To do 20%, In progress 69%, Done 11%',
        );
    });

    test('marks the highlighted bar level with a tag and renders extra summary', () => {
        renderCard({ summary: <span>Open: 89</span> });

        expect(screen.getByText('Open: 89')).toBeInTheDocument();
        expect(screen.getByTestId('marker-line').style.bottom).toBe('69%');
    });

    test('draws no marker when everything is zero', () => {
        renderCard({
            bars: bars.map((bar) => ({ ...bar, percent: 0 })),
        });

        expect(screen.queryByTestId('marker-line')).not.toBeInTheDocument();
    });

    test('can be collapsed from its header', () => {
        const toggle = vi.fn();
        renderCard({
            collapsed: true,
            onToggleCollapse: toggle,
            collapsedSummary: '725 issues',
        });

        expect(screen.getByTestId('total')).not.toBeVisible();
        expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
            '725 issues',
        );
        fireEvent.click(
            screen.getByRole('button', { name: /Issues by status/ }),
        );
        expect(toggle).toHaveBeenCalledTimes(1);
    });
});
