import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { makeIssueRow } from '@/tests/dashboardIssues';
import DeadlinesCard from './DeadlinesCard';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        'aria-label': label,
    }: {
        children: React.ReactNode;
        href?: string;
        'aria-label'?: string;
    }) => (
        <a href={href} aria-label={label}>
            {children}
        </a>
    ),
}));

// Tuesday 10 November 2026.
const NOW = new Date(2026, 10, 10, 12, 0);

const issues = [
    makeIssueRow(1, {
        title: 'Long late',
        endDate: '2026-11-03',
        assigneeId: 7,
    }),
    makeIssueRow(2, { title: 'Late', endDate: '2026-11-09', assigneeId: 8 }),
    makeIssueRow(3, {
        title: 'Today one',
        endDate: '2026-11-10',
        assigneeId: 7,
    }),
    makeIssueRow(4, {
        title: 'Today two',
        endDate: '2026-11-10',
        assigneeId: 7,
    }),
    makeIssueRow(5, {
        title: 'Tomorrow',
        endDate: '2026-11-11',
        assigneeId: 8,
    }),
    makeIssueRow(6, {
        title: 'Next week',
        endDate: '2026-11-17',
        assigneeId: 7,
    }),
    makeIssueRow(7, {
        title: 'In three weeks',
        endDate: '2026-12-01',
        assigneeId: 7,
    }),
];

const names = () =>
    screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')?.split(',')[0]);

const base = { issues, scope: 'all' as const, userId: 7, now: NOW };

describe('DeadlinesCard', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('as a list', () => {
        test('lists what is due in the range, overdue first, as links to the issues', () => {
            render(<DeadlinesCard {...base} range={14} />);

            expect(
                screen.getByRole('list', { name: 'Upcoming deadlines' }),
            ).toBeInTheDocument();
            expect(names()).toEqual([
                '#11 Long late',
                '#12 Late',
                '#13 Today one',
                '#14 Today two',
                '#15 Tomorrow',
                '#16 Next week',
            ]);
        });

        test('says how many are overdue, else how far it looks', () => {
            const { rerender } = render(<DeadlinesCard {...base} />);
            expect(screen.getByText('2 overdue')).toBeInTheDocument();

            rerender(<DeadlinesCard {...base} overdue={false} range={30} />);
            expect(screen.getByText('Next 30 days')).toBeInTheDocument();
        });

        test('can leave the overdue out and look further ahead', () => {
            render(<DeadlinesCard {...base} overdue={false} range={30} />);

            expect(names()).toContain('#17 In three weeks');
            expect(names()).not.toContain('#11 Long late');
        });

        test('keeps only the issues of the user in the mine scope', () => {
            render(<DeadlinesCard {...base} scope="mine" />);

            expect(names()).toEqual([
                '#11 Long late',
                '#13 Today one',
                '#14 Today two',
                '#16 Next week',
            ]);
        });

        test('shows no more than the limit', () => {
            render(<DeadlinesCard {...base} limit={2} />);

            expect(screen.getAllByRole('link')).toHaveLength(2);
        });

        test('can leave its title out', () => {
            render(<DeadlinesCard {...base} showHeader={false} />);

            expect(
                screen.queryByText('Upcoming Deadlines'),
            ).not.toBeInTheDocument();
        });

        test('a narrow card puts the due date under the title', () => {
            vi.spyOn(
                HTMLElement.prototype,
                'clientWidth',
                'get',
            ).mockReturnValue(300);

            render(<DeadlinesCard {...base} />);

            const link = screen.getAllByRole('link')[0];
            expect(
                within(link).getByText('Long late').parentElement,
            ).toContainElement(within(link).getByTestId('due-chip'));
        });
    });

    describe('as a timeline', () => {
        test('groups the issues by day with the late ones first', () => {
            render(<DeadlinesCard {...base} variant="timeline" range={14} />);

            const headings = screen
                .getAllByRole('heading', { level: 4 })
                .map((h) => h.textContent);
            expect(headings).toEqual([
                'Overdue2 issues',
                'Today2 issues',
                'Tomorrow1 issue',
                'Tue, 17 Nov1 issue',
            ]);
            expect(
                screen.getByRole('list', { name: 'Deadlines by day' }),
            ).toBeInTheDocument();
        });

        test('shows the due date only on the overdue group, as the others say it in their heading', () => {
            render(<DeadlinesCard {...base} variant="timeline" />);

            expect(screen.getAllByTestId('due-chip')).toHaveLength(2);
        });
    });

    describe('as a week', () => {
        test('has a column for each of the next seven days, named with what is due', () => {
            render(<DeadlinesCard {...base} variant="week" />);

            const week = screen.getByRole('list', {
                name: 'The next seven days',
            });
            const days = within(week).getAllByRole('listitem', { name: /due/ });
            expect(days.map((day) => day.getAttribute('aria-label'))).toEqual([
                'Late, 2 due',
                'Today 10, 2 due',
                'Wed 11, 1 due',
                'Thu 12, nothing due',
                'Fri 13, nothing due',
                'Sat 14, nothing due',
                'Sun 15, nothing due',
                'Mon 16, nothing due',
            ]);
        });

        test('does not count what is due in seven days, which has no column', () => {
            render(
                <DeadlinesCard
                    {...base}
                    variant="week"
                    issues={[
                        makeIssueRow(9, {
                            title: 'In a week',
                            endDate: '2026-11-17',
                        }),
                    ]}
                />,
            );

            expect(screen.getByText('No deadlines ahead')).toBeInTheDocument();
            expect(
                screen.queryByRole('list', { name: 'The next seven days' }),
            ).not.toBeInTheDocument();
        });

        test('leaves the late column out when asked to', () => {
            render(<DeadlinesCard {...base} variant="week" overdue={false} />);

            expect(
                screen.queryByLabelText('Late, 2 due'),
            ).not.toBeInTheDocument();
            expect(
                screen.getByLabelText('Today 10, 2 due'),
            ).toBeInTheDocument();
        });

        test('shows the first three of a day and counts the rest', () => {
            const many = [1, 2, 3, 4, 5].map((id) =>
                makeIssueRow(id, {
                    title: `Task ${id}`,
                    endDate: '2026-11-12',
                }),
            );

            render(
                <DeadlinesCard
                    issues={many}
                    variant="week"
                    scope="all"
                    now={NOW}
                />,
            );

            const day = screen.getByLabelText('Thu 12, 5 due');
            expect(within(day).getAllByRole('link')).toHaveLength(3);
            expect(within(day).getByText('+2 more')).toBeInTheDocument();
        });

        test('scrolls the days when the card is narrow', () => {
            render(<DeadlinesCard {...base} variant="week" />);

            expect(
                screen.getByRole('list', { name: 'The next seven days' }),
            ).toHaveClass('snap-x');
        });

        test('spreads the days over the card when it is wide', () => {
            vi.spyOn(
                HTMLElement.prototype,
                'clientWidth',
                'get',
            ).mockReturnValue(800);

            render(<DeadlinesCard {...base} variant="week" />);

            expect(
                screen.getByRole('list', { name: 'The next seven days' }),
            ).not.toHaveClass('snap-x');
        });
    });

    describe('with nothing to show', () => {
        test.each([['list'], ['timeline'], ['week']])(
            'the %s says so, and for whom',
            (variant) => {
                const { rerender } = render(
                    <DeadlinesCard
                        issues={[]}
                        variant={variant}
                        scope="mine"
                        now={NOW}
                    />,
                );
                expect(
                    screen.getByText('No deadlines ahead'),
                ).toBeInTheDocument();
                expect(
                    screen.getByText(
                        'Nothing assigned to you is due in this time.',
                    ),
                ).toBeInTheDocument();

                rerender(
                    <DeadlinesCard
                        issues={[]}
                        variant={variant}
                        scope="all"
                        now={NOW}
                    />,
                );
                expect(
                    screen.getByText(
                        'Nothing in your projects is due in this time.',
                    ),
                ).toBeInTheDocument();
            },
        );
    });
});
