import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { makeIssueStats } from '@/tests/issueStats';
import DashboardVisuals from './DashboardVisuals';

describe('DashboardVisuals Component', () => {
    test('renders the three visual cards', () => {
        render(
            <DashboardVisuals
                stats={makeIssueStats()}
                productivity_trend={[]}
            />,
        );

        expect(screen.getByText('Completion Ratio')).toBeInTheDocument();
        expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Productivity Trend')).toBeInTheDocument();
    });

    test('shows a 0% completion ratio when there are no issues', () => {
        render(
            <DashboardVisuals
                stats={makeIssueStats()}
                productivity_trend={[]}
            />,
        );

        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('computes the closed percentage from the issues', () => {
        const stats = makeIssueStats({ done: 3, todo: 1 });
        render(<DashboardVisuals stats={stats} productivity_trend={[]} />);

        // 3 of 4 closed => 75%.
        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('computes the in-progress count from the issues', () => {
        const stats = makeIssueStats({ inProgress: 2, todo: 1, done: 1 });
        render(<DashboardVisuals stats={stats} productivity_trend={[]} />);

        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('computes the priority breakdown counts', () => {
        const stats = makeIssueStats({
            high: 2,
            medium: 1,
            low: 1,
            todo: 4,
        });
        render(<DashboardVisuals stats={stats} productivity_trend={[]} />);

        // 2 high of 4 => "(50%)". Confirm the high-priority count is shown.
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('(50%)')).toBeInTheDocument();
    });
});
