import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DayBreakdownCard from './DayBreakdownCard';

const days = [
    {
        key: '2026-11-03',
        label: 'Tue',
        dayNumber: '03',
        rows: [
            { key: 'error', label: 'Errors', value: 1, color: '#f44336' },
            { key: 'critical', label: 'Critical', value: 0, color: '#9c27b0' },
        ],
    },
    {
        key: '2026-11-04',
        label: 'Wed',
        dayNumber: '04',
        rows: [
            {
                key: 'error',
                label: 'Errors',
                value: 4,
                color: '#f44336',
                delta: 300,
            },
            {
                key: 'critical',
                label: 'Critical',
                value: 2,
                color: '#9c27b0',
                delta: 0,
            },
        ],
    },
];

const renderCard = (props = {}) =>
    render(
        <DayBreakdownCard
            title="Errors"
            icon="Bug"
            days={days}
            headline={(total) => `${total} problems`}
            {...props}
        />,
    );

describe('DayBreakdownCard', () => {
    test('selects the last day first and sums its rows in the headline', () => {
        renderCard();

        expect(screen.getByTestId('headline')).toHaveTextContent('6 problems');
        expect(screen.getByRole('tab', { name: /04/ })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    test('switching day updates the headline and rows', async () => {
        renderCard();

        fireEvent.click(screen.getByRole('tab', { name: /03/ }));

        await waitFor(() =>
            expect(screen.getByTestId('headline')).toHaveTextContent(
                '1 problems',
            ),
        );
        expect(screen.getByRole('tab', { name: /03/ })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    test('honours initialDayKey', () => {
        renderCard({ initialDayKey: '2026-11-03' });

        expect(screen.getByTestId('headline')).toHaveTextContent('1 problems');
    });

    test('renders a delta badge only for rows that have one', () => {
        renderCard();

        expect(screen.getByText('300%')).toBeInTheDocument();
        expect(screen.getAllByText('0%')).toHaveLength(1);
    });

    test('renders the headline trend', () => {
        renderCard({ headlineTrend: { value: 12, positiveIsGood: false } });

        expect(screen.getByText('12%')).toBeInTheDocument();
    });

    test('shows the empty text without days', () => {
        renderCard({ days: [], emptyText: 'Nothing logged' });

        expect(screen.getByText('Nothing logged')).toBeInTheDocument();
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    test('can be collapsed from its header', () => {
        const toggle = vi.fn();
        renderCard({
            collapsed: true,
            onToggleCollapse: toggle,
            collapsedSummary: '6 problems',
        });

        expect(screen.getByTestId('headline')).not.toBeVisible();
        expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
            '6 problems',
        );
        fireEvent.click(screen.getByRole('button', { name: /Errors/ }));
        expect(toggle).toHaveBeenCalledTimes(1);
    });

    test('arrow keys, Home and End move between days; every pill stays in the TAB order', async () => {
        renderCard();
        const tabs = screen.getAllByRole('tab');
        tabs.forEach((tab) =>
            expect(tab).not.toHaveAttribute('tabindex', '-1'),
        );

        fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
        await waitFor(() =>
            expect(tabs[0]).toHaveAttribute('aria-selected', 'true'),
        );
        expect(tabs[0]).toHaveFocus();

        fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
        await waitFor(() =>
            expect(tabs[1]).toHaveAttribute('aria-selected', 'true'),
        );

        fireEvent.keyDown(tabs[1], { key: 'Home' });
        await waitFor(() =>
            expect(tabs[0]).toHaveAttribute('aria-selected', 'true'),
        );

        fireEvent.keyDown(tabs[0], { key: 'End' });
        await waitFor(() =>
            expect(tabs[1]).toHaveAttribute('aria-selected', 'true'),
        );
    });

    test('arrows at the ends stay put and other keys are left alone', () => {
        renderCard();
        const tabs = screen.getAllByRole('tab');

        fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
        fireEvent.keyDown(tabs[1], { key: 'a' });

        expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    test('the pills are linked to the day panel and show a focus ring', () => {
        renderCard();

        const selected = screen.getByRole('tab', { selected: true });
        const panel = screen.getByRole('tabpanel');
        expect(selected).toHaveAttribute('aria-controls', panel.id);
        expect(panel).toHaveAttribute('aria-labelledby', selected.id);
        expect(selected.className).toContain('focus-visible:ring-2');
    });

    test('the pills scroll and snap instead of squeezing when the card is narrow', () => {
        renderCard();

        expect(screen.getByTestId('day-scroller')).toHaveClass(
            'overflow-x-auto',
            'snap-x',
            'snap-mandatory',
            'no-scrollbar',
        );
        screen.getAllByRole('tab').forEach((tab) => {
            expect(tab).toHaveClass('snap-center', 'shrink-0', 'w-12');
        });
    });

    test('only the pill row scrolls, sideways, to the chosen day on first paint and when it changes', async () => {
        const scrollTo = vi.fn();
        const scrollIntoView = vi.fn();
        Element.prototype.scrollTo = scrollTo;
        Element.prototype.scrollIntoView = scrollIntoView;
        renderCard();

        expect(scrollTo).toHaveBeenLastCalledWith(
            expect.objectContaining({ behavior: 'auto' }),
        );

        fireEvent.click(screen.getAllByRole('tab')[0]);

        await waitFor(() =>
            expect(scrollTo).toHaveBeenLastCalledWith(
                expect.objectContaining({ behavior: 'smooth' }),
            ),
        );
        // The page itself must never be scrolled by the card.
        expect(scrollIntoView).not.toHaveBeenCalled();
        delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
        delete (Element.prototype as { scrollIntoView?: unknown })
            .scrollIntoView;
    });

    test('the pills sit together in the middle with a small gap, not spread to the edges', () => {
        renderCard();

        const row = screen.getByRole('tablist');
        expect(row).toHaveClass('mx-auto', 'w-max', 'gap-2');
        expect(row.className).not.toContain('justify-between');
    });

    test('until a day is picked the card follows the newest day, e.g. after midnight', () => {
        const { rerender } = renderCard();
        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
            '04',
        );

        const tomorrow = {
            key: '2026-11-05',
            label: 'Thu',
            dayNumber: '05',
            rows: [
                { key: 'error', label: 'Errors', value: 9, color: '#f44336' },
            ],
        };
        rerender(
            <DayBreakdownCard
                title="Errors"
                icon="Bug"
                days={[...days, tomorrow]}
                headline={(total) => `${total} problems`}
            />,
        );

        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
            '05',
        );
    });

    test('a day the user picked stays selected when a newer day appears', () => {
        const { rerender } = renderCard();
        fireEvent.click(screen.getByRole('tab', { name: /03/ }));

        rerender(
            <DayBreakdownCard
                title="Errors"
                icon="Bug"
                days={[
                    ...days,
                    {
                        key: '2026-11-05',
                        label: 'Thu',
                        dayNumber: '05',
                        rows: [],
                    },
                ]}
                headline={(total) => `${total} problems`}
            />,
        );

        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
            '03',
        );
    });
});
