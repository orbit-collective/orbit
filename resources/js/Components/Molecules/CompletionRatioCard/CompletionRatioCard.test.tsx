import { render, screen } from '@testing-library/react';
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
