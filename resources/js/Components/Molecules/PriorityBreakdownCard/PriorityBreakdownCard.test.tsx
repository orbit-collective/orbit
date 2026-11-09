import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PriorityBreakdownCard } from './PriorityBreakdownCard';

describe('PriorityBreakdownCard Component', () => {
    const defaultProps = {
        priorities: [
            {
                name: 'High',
                color: '#f44336',
                icon: 'SignalHigh',
                position: 0,
                count: 3,
            },
            {
                name: 'Medium',
                color: '#ff9800',
                icon: 'SignalMedium',
                position: 1,
                count: 5,
            },
            {
                name: 'Urgent',
                color: '#9c27b0',
                icon: 'Flame',
                position: 2,
                count: 2,
            },
        ],
        noPriority: 0,
        total: 10,
    };

    test('renders the card title and description', () => {
        render(<PriorityBreakdownCard {...defaultProps} />);

        expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
        expect(
            screen.getByText('Issues distribution by level of urgency'),
        ).toBeInTheDocument();
    });

    test('renders a row for each priority, under the name the projects gave it', () => {
        render(<PriorityBreakdownCard {...defaultProps} />);

        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    test('renders the counts and percentages for each priority', () => {
        render(<PriorityBreakdownCard {...defaultProps} />);

        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('(30%)')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('(50%)')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('(20%)')).toBeInTheDocument();
    });

    test('sizes and colors each segment of the distribution bar by its priority', () => {
        const { container } = render(
            <PriorityBreakdownCard {...defaultProps} />,
        );

        const high = container.querySelector('[title="High: 30%"]');
        const urgent = container.querySelector('[title="Urgent: 20%"]');

        expect(high).toHaveAttribute('data-width-percent', '30');
        expect(high).toHaveStyle({ backgroundColor: '#f44336' });
        expect(urgent).toHaveAttribute('data-width-percent', '20');
        expect(urgent).toHaveStyle({ backgroundColor: '#9c27b0' });
    });

    test('adds a "No priority" row only when some issues have none', () => {
        const { rerender } = render(
            <PriorityBreakdownCard {...defaultProps} />,
        );
        expect(screen.queryByText('No priority')).not.toBeInTheDocument();

        rerender(
            <PriorityBreakdownCard
                {...defaultProps}
                noPriority={4}
                total={14}
            />,
        );

        expect(screen.getByText('No priority')).toBeInTheDocument();
        expect(screen.getByText('(29%)')).toBeInTheDocument();
    });

    test('says so when there are no issues', () => {
        render(
            <PriorityBreakdownCard priorities={[]} noPriority={0} total={0} />,
        );

        expect(screen.getByText('No issues yet')).toBeInTheDocument();
    });

    test('the segments grow in and the rows rise in until everything is visible', async () => {
        const { container } = render(
            <PriorityBreakdownCard {...defaultProps} />,
        );

        const segments = container.querySelectorAll(
            '[data-testid="priority-segment"]',
        );
        expect(segments.length).toBeGreaterThan(0);
        await waitFor(() => expect(screen.getByText('High')).toBeVisible());
        segments.forEach((segment) =>
            expect(segment).toHaveAttribute('data-width-percent'),
        );
    });

    test('the counts follow new data', async () => {
        const { rerender } = render(
            <PriorityBreakdownCard {...defaultProps} />,
        );

        rerender(
            <PriorityBreakdownCard
                {...defaultProps}
                noPriority={9}
                total={defaultProps.total + 9}
            />,
        );

        expect(await screen.findByText('No priority')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByText('(47%)')).toBeInTheDocument(),
        );
    });

    describe('variants and options', () => {
        const priorities = [
            {
                name: 'High',
                color: '#f44336',
                icon: 'SignalHigh',
                position: 0,
                count: 2,
            },
            {
                name: 'Low',
                color: '#4caf50',
                icon: 'SignalLow',
                position: 1,
                count: 6,
            },
        ];
        const base = { priorities, noPriority: 2, total: 10 };

        test('the list variant gives each priority its own bar', () => {
            render(<PriorityBreakdownCard {...base} variant="list" />);

            const bars = screen.getAllByTestId('priority-row-bar');
            expect(
                bars.map((bar) => bar.getAttribute('data-width-percent')),
            ).toEqual(['20', '60', '20']);
            expect(
                screen.queryByTestId('priority-segment'),
            ).not.toBeInTheDocument();
        });

        test('the donut variant draws an arc per group and the total', () => {
            render(<PriorityBreakdownCard {...base} variant="donut" />);

            expect(screen.getAllByTestId('priority-arc')).toHaveLength(3);
            expect(screen.getByText('issues')).toBeInTheDocument();
            expect(screen.getByText('High')).toBeInTheDocument();
        });

        test('the donut skips a group without issues', () => {
            render(
                <PriorityBreakdownCard
                    {...base}
                    priorities={[{ ...priorities[0], count: 0 }, priorities[1]]}
                    noPriority={0}
                    variant="donut"
                />,
            );

            expect(screen.getAllByTestId('priority-arc')).toHaveLength(1);
        });

        test('groups can be ordered by size', () => {
            render(<PriorityBreakdownCard {...base} sort="count" />);

            const labels = screen
                .getAllByText(/^(High|Low|No priority)$/)
                .map((el) => el.textContent);
            expect(labels).toEqual(['Low', 'High', 'No priority']);
        });

        test('the group without a priority can be left out', () => {
            render(<PriorityBreakdownCard {...base} showNoPriority={false} />);

            expect(screen.queryByText('No priority')).not.toBeInTheDocument();
        });

        test('percentages and the title can be hidden', () => {
            render(
                <PriorityBreakdownCard
                    {...base}
                    showPercent={false}
                    showHeader={false}
                />,
            );

            expect(screen.queryByText('(60%)')).not.toBeInTheDocument();
            expect(
                screen.queryByText('Priority Breakdown'),
            ).not.toBeInTheDocument();
        });

        test('the list variant hides percentages too and says when there is nothing', () => {
            const { rerender } = render(
                <PriorityBreakdownCard
                    {...base}
                    variant="list"
                    showPercent={false}
                />,
            );
            expect(screen.queryByText('(60%)')).not.toBeInTheDocument();

            rerender(
                <PriorityBreakdownCard
                    priorities={[]}
                    noPriority={0}
                    total={0}
                    variant="list"
                />,
            );
            expect(screen.getByText('No issues yet')).toBeInTheDocument();
        });

        test('groups can be ordered by name', () => {
            render(<PriorityBreakdownCard {...base} sort="name" />);

            const labels = screen
                .getAllByText(/^(High|Low|No priority)$/)
                .map((el) => el.textContent);
            expect(labels).toEqual(['High', 'Low', 'No priority']);
        });

        test('can be called something else, for a breakdown that is not of priorities', () => {
            render(
                <PriorityBreakdownCard
                    {...base}
                    title="Issue Types"
                    description="Your issues grouped by type"
                />,
            );

            expect(screen.getByText('Issue Types')).toBeInTheDocument();
            expect(
                screen.getByText('Your issues grouped by type'),
            ).toBeInTheDocument();
            expect(
                screen.queryByText('Priority Breakdown'),
            ).not.toBeInTheDocument();
        });
    });
});
