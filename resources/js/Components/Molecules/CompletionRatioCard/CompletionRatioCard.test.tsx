import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CompletionRatioCard } from './CompletionRatioCard';

describe('CompletionRatioCard Component', () => {
    test('renders the card title and description', () => {
        render(
            <CompletionRatioCard
                open={4}
                inProgress={0}
                closed={6}
                total={10}
                closedPct={60}
            />,
        );

        expect(screen.getByText('Completion Ratio')).toBeInTheDocument();
        expect(
            screen.getByText('Resolution status of all logged tasks'),
        ).toBeInTheDocument();
    });

    test('renders the closed percentage as the hero figure with its breakdown', () => {
        render(
            <CompletionRatioCard
                open={4}
                inProgress={0}
                closed={6}
                total={10}
                closedPct={60}
            />,
        );

        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(screen.getByText('Resolved')).toBeInTheDocument();
        expect(screen.getByText('6 of 10 issues')).toBeInTheDocument();
    });

    test('renders a labelled bar for each status with its count', () => {
        render(
            <CompletionRatioCard
                open={3}
                inProgress={2}
                closed={5}
                total={10}
                closedPct={50}
            />,
        );

        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();

        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();

        expect(screen.getByText('Closed')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('shows an "Excellent" tier badge for a high closed percentage', () => {
        render(
            <CompletionRatioCard
                open={1}
                inProgress={0}
                closed={9}
                total={10}
                closedPct={90}
            />,
        );

        expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    test('shows an "On track" tier badge for a mid closed percentage', () => {
        render(
            <CompletionRatioCard
                open={5}
                inProgress={0}
                closed={5}
                total={10}
                closedPct={50}
            />,
        );

        expect(screen.getByText('On track')).toBeInTheDocument();
    });

    test('shows a "Needs attention" tier badge for a low closed percentage', () => {
        render(
            <CompletionRatioCard
                open={9}
                inProgress={0}
                closed={1}
                total={10}
                closedPct={10}
            />,
        );

        expect(screen.getByText('Needs attention')).toBeInTheDocument();
    });

    test('hides the tier badge when there are no issues yet', () => {
        render(
            <CompletionRatioCard
                open={0}
                inProgress={0}
                closed={0}
                total={0}
                closedPct={0}
            />,
        );

        expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    });

    test('renders without crashing when there are no issues', () => {
        render(
            <CompletionRatioCard
                open={0}
                inProgress={0}
                closed={0}
                total={0}
                closedPct={0}
            />,
        );

        expect(screen.getByText('0%')).toBeInTheDocument();
        expect(screen.getByText('0 of 0 issues')).toBeInTheDocument();
    });
});
