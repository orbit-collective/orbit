import { fireEvent, render, screen } from '@testing-library/react';
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

    test('switching day updates the headline and rows', () => {
        renderCard();

        fireEvent.click(screen.getByRole('tab', { name: /03/ }));

        expect(screen.getByTestId('headline')).toHaveTextContent('1 problems');
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
});
