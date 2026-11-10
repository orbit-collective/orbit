import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { makeIssueRow } from '@/tests/dashboardIssues';
import DashboardIssueRow from './DashboardIssueRow';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
        'aria-label': label,
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
        'aria-label'?: string;
    }) => (
        <a href={href} className={className} aria-label={label}>
            {children}
        </a>
    ),
}));

const NOW = new Date(2026, 10, 10, 12, 0);
const issue = makeIssueRow(1);

describe('DashboardIssueRow', () => {
    test('is a link to the issue in its project', () => {
        render(<DashboardIssueRow issue={issue} now={NOW} />);

        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            '/projects/3/issues/1',
        );
    });

    test('shows the number, the title, the project and the due date', () => {
        render(<DashboardIssueRow issue={issue} now={NOW} />);

        expect(screen.getByText('#11')).toBeInTheDocument();
        expect(screen.getByText('Fix the thing 1')).toBeInTheDocument();
        expect(screen.getByText('Orbit')).toBeInTheDocument();
        expect(screen.getByTestId('due-chip')).toHaveAttribute(
            'data-tone',
            'soon',
        );
    });

    test('is named with all it says, so it reads well aloud', () => {
        render(<DashboardIssueRow issue={issue} now={NOW} />);

        expect(screen.getByRole('link')).toHaveAccessibleName(
            '#11 Fix the thing 1, in Orbit, High priority, due in 4 days',
        );
    });

    test('says when it is due in its name, so a screen reader hears it too', () => {
        render(
            <DashboardIssueRow
                issue={{ ...issue, endDate: '2026-11-08' }}
                now={NOW}
            />,
        );

        expect(screen.getByRole('link')).toHaveAccessibleName(
            /High priority, 2 days overdue$/,
        );
    });

    test('leaves out what is switched off, in the name as well', () => {
        render(
            <DashboardIssueRow
                issue={issue}
                now={NOW}
                show={{
                    project: false,
                    priority: false,
                    due: false,
                    type: false,
                }}
            />,
        );

        expect(screen.getByRole('link')).toHaveAccessibleName(
            '#11 Fix the thing 1',
        );
        expect(screen.queryByText('Orbit')).not.toBeInTheDocument();
        expect(screen.queryByTestId('due-chip')).not.toBeInTheDocument();
    });

    test('copes with an issue that has no type, priority, project or end date', () => {
        render(
            <DashboardIssueRow
                issue={makeIssueRow(2, {
                    type: null,
                    priority: null,
                    projectName: null,
                    projectColor: null,
                    endDate: null,
                })}
                now={NOW}
            />,
        );

        expect(screen.getByRole('link')).toHaveAccessibleName(
            '#12 Fix the thing 2',
        );
        expect(screen.queryByTestId('due-chip')).not.toBeInTheDocument();
    });

    test('a narrow row drops the project and puts the due date under the title', () => {
        render(<DashboardIssueRow issue={issue} now={NOW} narrow />);

        expect(screen.queryByText('Orbit')).not.toBeInTheDocument();
        const chip = screen.getByTestId('due-chip');
        expect(chip.closest('a')).not.toBeNull();
        expect(
            screen.getByText('Fix the thing 1').parentElement,
        ).toContainElement(chip);
    });

    test('the compact row is tighter than the full one', () => {
        const { rerender } = render(
            <DashboardIssueRow issue={issue} now={NOW} />,
        );
        expect(screen.getByRole('link')).toHaveClass('min-h-10');

        rerender(
            <DashboardIssueRow issue={issue} now={NOW} density="compact" />,
        );
        expect(screen.getByRole('link')).toHaveClass('min-h-8');
    });

    test('the card is a bordered tile with its details at the bottom', () => {
        render(<DashboardIssueRow issue={issue} now={NOW} density="card" />);

        const link = screen.getByRole('link');
        expect(link).toHaveClass('flex-col', 'border');
        expect(link).toContainElement(screen.getByText('Orbit'));
        expect(screen.getAllByTestId('due-chip')).toHaveLength(1);
    });

    test('a card without details has no bottom row', () => {
        render(
            <DashboardIssueRow
                issue={issue}
                now={NOW}
                density="card"
                show={{ project: false, priority: false, due: false }}
            />,
        );

        expect(screen.queryByText('Orbit')).not.toBeInTheDocument();
        expect(screen.queryByTestId('due-chip')).not.toBeInTheDocument();
    });

    test('is reachable with the keyboard and shows where the focus is', () => {
        render(<DashboardIssueRow issue={issue} now={NOW} />);

        expect(screen.getByRole('link').className).toContain(
            'focus-visible:ring-2',
        );
    });
});
