import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Issue } from '@/types/Issues';
import DashboardVisuals from './DashboardVisuals';

let counter = 0;
const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: `ISSUE-${counter++}`,
    title: 'Some issue',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

describe('DashboardVisuals Component', () => {
    test('renders the three visual cards', () => {
        render(<DashboardVisuals issues={[]} productivity_trend={[]} />);

        expect(screen.getByText('Completion Ratio')).toBeInTheDocument();
        expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Productivity Trend')).toBeInTheDocument();
    });

    test('shows a 0% completion ratio when there are no issues', () => {
        render(<DashboardVisuals issues={[]} productivity_trend={[]} />);

        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('computes the closed percentage from the issues', () => {
        const issues = [
            makeIssue({ status: 'closed' }),
            makeIssue({ status: 'closed' }),
            makeIssue({ status: 'closed' }),
            makeIssue({ status: 'open' }),
        ];
        render(<DashboardVisuals issues={issues} productivity_trend={[]} />);

        // 3 of 4 closed => 75%.
        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('computes the in-progress count from the issues', () => {
        const issues = [
            makeIssue({ status: 'in_progress' }),
            makeIssue({ status: 'in_progress' }),
            makeIssue({ status: 'open' }),
            makeIssue({ status: 'closed' }),
        ];
        render(<DashboardVisuals issues={issues} productivity_trend={[]} />);

        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('computes the priority breakdown counts', () => {
        const issues = [
            makeIssue({ priority: 'high' }),
            makeIssue({ priority: 'high' }),
            makeIssue({ priority: 'medium' }),
            makeIssue({ priority: 'low' }),
        ];
        render(<DashboardVisuals issues={issues} productivity_trend={[]} />);

        // 2 high of 4 => "(50%)". Confirm the high-priority count is shown.
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('(50%)')).toBeInTheDocument();
    });
});
