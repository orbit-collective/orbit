import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CompletionRatioCard } from './CompletionRatioCard';

describe('CompletionRatioCard Component', () => {
    test('renders the card title and description', () => {
        render(
            <CompletionRatioCard
                todo={4}
                inProgress={0}
                done={6}
                total={10}
                donePct={60}
            />,
        );

        expect(screen.getByText('Completion Ratio')).toBeInTheDocument();
        expect(
            screen.getByText('Resolution status of all logged tasks'),
        ).toBeInTheDocument();
    });

    test('renders the done percentage as the hero figure with its breakdown', () => {
        render(
            <CompletionRatioCard
                todo={4}
                inProgress={0}
                done={6}
                total={10}
                donePct={60}
            />,
        );

        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(screen.getByText('Resolved')).toBeInTheDocument();
        expect(screen.getByText('6 of 10 issues')).toBeInTheDocument();
    });

    test('renders a labelled bar for each status with its count', () => {
        render(
            <CompletionRatioCard
                todo={3}
                inProgress={2}
                done={5}
                total={10}
                donePct={50}
            />,
        );

        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();

        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();

        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('shows an "Excellent" tier badge for a high done percentage', () => {
        render(
            <CompletionRatioCard
                todo={1}
                inProgress={0}
                done={9}
                total={10}
                donePct={90}
            />,
        );

        expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    test('shows an "On track" tier badge for a mid done percentage', () => {
        render(
            <CompletionRatioCard
                todo={5}
                inProgress={0}
                done={5}
                total={10}
                donePct={50}
            />,
        );

        expect(screen.getByText('On track')).toBeInTheDocument();
    });

    test('shows a "Needs attention" tier badge for a low done percentage', () => {
        render(
            <CompletionRatioCard
                todo={9}
                inProgress={0}
                done={1}
                total={10}
                donePct={10}
            />,
        );

        expect(screen.getByText('Needs attention')).toBeInTheDocument();
    });

    test('hides the tier badge when there are no issues yet', () => {
        render(
            <CompletionRatioCard
                todo={0}
                inProgress={0}
                done={0}
                total={0}
                donePct={0}
            />,
        );

        expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    });

    test('renders without crashing when there are no issues', () => {
        render(
            <CompletionRatioCard
                todo={0}
                inProgress={0}
                done={0}
                total={0}
                donePct={0}
            />,
        );

        expect(screen.getByText('0%')).toBeInTheDocument();
        expect(screen.getByText('0 of 0 issues')).toBeInTheDocument();
    });
});

describe('CompletionRatioCard motion', () => {
    test('the bars grow to their share of the largest one and every figure ends up visible', async () => {
        render(
            <CompletionRatioCard
                todo={2}
                inProgress={4}
                done={8}
                total={14}
                donePct={57}
            />,
        );

        const bars = screen.getAllByTestId('completion-bar');
        expect(
            bars.map((bar) => bar.getAttribute('data-height-percent')),
        ).toEqual(['25', '50', '100']);
        await waitFor(() => bars.forEach((bar) => expect(bar).toBeVisible()));
        expect(screen.getByText('57%')).toBeVisible();
    });

    test('the hero percentage follows a new value', async () => {
        const { rerender } = render(
            <CompletionRatioCard
                todo={5}
                inProgress={0}
                done={5}
                total={10}
                donePct={50}
            />,
        );

        rerender(
            <CompletionRatioCard
                todo={2}
                inProgress={0}
                done={8}
                total={10}
                donePct={80}
            />,
        );

        expect(await screen.findByText('80%')).toBeInTheDocument();
        expect(await screen.findByText('8 of 10 issues')).toBeInTheDocument();
    });

    test('a different tier pops its dot in again (new element)', () => {
        const { rerender } = render(
            <CompletionRatioCard
                todo={9}
                inProgress={0}
                done={1}
                total={10}
                donePct={10}
            />,
        );
        const dot = () =>
            screen.getByText('Needs attention').previousElementSibling;
        const first = dot();

        rerender(
            <CompletionRatioCard
                todo={1}
                inProgress={0}
                done={9}
                total={10}
                donePct={90}
            />,
        );

        expect(screen.getByText('Excellent')).toBeInTheDocument();
        expect(screen.getByText('Excellent').previousElementSibling).not.toBe(
            first,
        );
    });

    describe('variants and options', () => {
        const props = {
            todo: 2,
            inProgress: 1,
            done: 3,
            total: 6,
            donePct: 50,
        };

        test('the stacked variant is one bar split by status with its counts', () => {
            render(<CompletionRatioCard {...props} variant="stacked" />);

            expect(screen.getAllByTestId('completion-segment')).toHaveLength(3);
            expect(
                screen.queryByTestId('completion-bar'),
            ).not.toBeInTheDocument();
            expect(screen.getByText('3 of 6 resolved')).toBeInTheDocument();
        });

        test('the stacked variant copes with no issues', () => {
            render(
                <CompletionRatioCard
                    todo={0}
                    inProgress={0}
                    done={0}
                    total={0}
                    donePct={0}
                    variant="stacked"
                />,
            );

            expect(screen.getAllByTestId('completion-segment')).toHaveLength(3);
        });

        test('the title can be hidden and the status label kept', () => {
            render(<CompletionRatioCard {...props} showHeader={false} />);

            expect(
                screen.queryByText('Completion Ratio'),
            ).not.toBeInTheDocument();
            expect(screen.getByText('On track')).toBeInTheDocument();
        });

        test('the status label can be hidden and the title kept', () => {
            render(<CompletionRatioCard {...props} showTier={false} />);

            expect(screen.getByText('Completion Ratio')).toBeInTheDocument();
            expect(screen.queryByText('On track')).not.toBeInTheDocument();
        });

        test('hiding both leaves nothing above the chart', () => {
            render(
                <CompletionRatioCard
                    {...props}
                    showHeader={false}
                    showTier={false}
                />,
            );

            expect(
                screen.queryByText('Completion Ratio'),
            ).not.toBeInTheDocument();
            expect(screen.queryByText('On track')).not.toBeInTheDocument();
        });
    });
});
