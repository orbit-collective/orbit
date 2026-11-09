import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { makeIssueRow } from '@/tests/dashboardIssues';
import { makeStat, makeWidget } from '@/tests/dashboardLayout';
import { makeIssueStats } from '@/tests/issueStats';
import { makePaginated } from '@/tests/paginated';
import { DashboardWidget as Widget } from '@/types/Dashboard';
import { Project } from '@/types/Projects';
import { dateKeyOf } from '@/utils/dueDate';
import DashboardWidget from './DashboardWidget';

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({ runCommand: vi.fn() }),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href?: string;
    }) => <a href={href}>{children}</a>,
}));

vi.mock('@/Components/Organisms/ActivityFeedPanel/ActivityFeedPanel', () => ({
    default: ({
        activityLogs,
        compact,
    }: {
        activityLogs: { total: number };
        compact?: boolean;
    }) => (
        <div
            data-testid="activity-feed"
            data-total={activityLogs.total}
            data-compact={String(Boolean(compact))}
        />
    ),
}));

vi.mock(
    '@/Components/Molecules/ProductivityTrendCard/ProductivityTrendCard',
    () => ({
        ProductivityTrendCard: ({
            trendData,
            color,
        }: {
            trendData: unknown[];
            color?: string;
        }) => (
            <div
                data-testid="trend"
                data-points={trendData.length}
                data-color={color}
            />
        ),
    }),
);

const widget = (overrides: Partial<Widget> = {}): Widget => ({
    id: 'w',
    type: 'trend',
    variant: 'default',
    width: 40,
    height: 85,
    visible: true,
    config: {},
    ...overrides,
});

const project = (id: number): Project => ({
    id,
    name: `Project ${id}`,
    slug: `p${id}`,
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
});

describe('DashboardWidget', () => {
    const stats = makeIssueStats({ high: 2, todo: 2, done: 2 });

    test.each([
        ['projects', 'Active Projects'],
        ['open_issues', 'Open Issues'],
        ['critical', 'Critical Tasks'],
        ['resolution', 'Resolution Rate'],
    ] as const)('draws the %s stat card', (metric, title) => {
        render(
            <DashboardWidget
                widget={makeStat(metric)}
                data={{ issueStats: stats, projects: [project(1)] }}
            />,
        );

        expect(screen.getByText(title)).toBeInTheDocument();
    });

    test('computes the resolution rate from the issue counts', () => {
        render(
            <DashboardWidget
                widget={makeStat('resolution', { config: { show: 'percent' } })}
                data={{ issueStats: stats, projects: [] }}
            />,
        );

        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    });

    test('shows a placeholder while the data of a widget has not arrived', () => {
        const types = [
            'trend',
            'completion',
            'priority_breakdown',
            'activity',
        ] as const;

        const widgets = [
            ...types.map((type) => widget({ type })),
            ...['open_issues', 'critical', 'resolution', 'overdue'].map(
                (metric) => makeStat(metric),
            ),
        ];

        for (const item of widgets) {
            const { unmount } = render(
                <DashboardWidget widget={item} data={{ projects: [] }} />,
            );

            expect(
                screen.getByTestId('widget-placeholder'),
            ).toBeInTheDocument();
            unmount();
        }
    });

    test('draws the trend, completion, priority and activity widgets', () => {
        const data = {
            issueStats: stats,
            projects: [],
            productivity_trend: [],
            activityLogs: makePaginated([]),
        };

        const { rerender } = render(
            <DashboardWidget widget={widget({ type: 'trend' })} data={data} />,
        );
        expect(screen.getByTestId('trend')).toBeInTheDocument();

        rerender(
            <DashboardWidget
                widget={widget({ type: 'completion' })}
                data={data}
            />,
        );
        expect(screen.getByText('Completion Ratio')).toBeInTheDocument();

        rerender(
            <DashboardWidget
                widget={widget({ type: 'priority_breakdown' })}
                data={data}
            />,
        );
        expect(screen.getByText('High')).toBeInTheDocument();

        rerender(
            <DashboardWidget
                widget={widget({ type: 'activity' })}
                data={data}
            />,
        );
        expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    });

    test('the completion widget switches to a ring', () => {
        render(
            <DashboardWidget
                widget={widget({ type: 'completion', variant: 'ring' })}
                data={{ issueStats: stats, projects: [] }}
            />,
        );

        expect(screen.getByTestId('progress-arc')).toBeInTheDocument();
        expect(screen.queryByTestId('completion-bar')).not.toBeInTheDocument();
    });

    test('the projects widget honours its limit option', () => {
        render(
            <DashboardWidget
                widget={widget({ type: 'projects', config: { limit: 5 } })}
                data={{ projects: [1, 2, 3, 4, 5, 6].map(project) }}
            />,
        );

        expect(
            screen.getByText('Showing 5 latest projects'),
        ).toBeInTheDocument();
    });

    test('the projects widget falls back to the default limit', () => {
        render(
            <DashboardWidget
                widget={widget({ type: 'projects' })}
                data={{ projects: [1, 2, 3, 4].map(project) }}
            />,
        );

        expect(
            screen.getByText('Showing 3 latest projects'),
        ).toBeInTheDocument();
    });

    describe('options of the widgets', () => {
        const data = { issueStats: stats, projects: [project(1)] };
        const statWidget = (
            config: Widget['config'],
            metric: string = 'open_issues',
        ) => makeStat(metric, { config });

        test.each([
            ['open', 'Open Issues', '2'],
            ['todo', 'To Do', '2'],
            ['in_progress', 'In Progress', '0'],
            ['done', 'Done Issues', '2'],
            ['all', 'All Issues', '4'],
        ])('the open issues statistic can count %s', (count, title, value) => {
            render(
                <DashboardWidget widget={statWidget({ count })} data={data} />,
            );

            expect(screen.getByText(title)).toBeInTheDocument();
            expect(screen.getByText(value)).toBeInTheDocument();
        });

        test('an unknown count falls back to the open issues', () => {
            render(
                <DashboardWidget
                    widget={statWidget({ count: 'bogus' })}
                    data={data}
                />,
            );

            expect(screen.getByText('Open Issues')).toBeInTheDocument();
        });

        test('the resolution rate can be shown as done out of all', () => {
            render(
                <DashboardWidget
                    widget={statWidget({ show: 'fraction' }, 'resolution')}
                    data={data}
                />,
            );

            expect(screen.getByText('/ 4')).toBeInTheDocument();
        });

        describe('the one statistic widget', () => {
            const busy = makeIssueStats({
                todo: 3,
                inProgress: 1,
                done: 4,
                overdue: 2,
                assigned: 3,
            });
            const busyData = { issueStats: busy, projects: [project(1)] };
            const noIcon = { icon: 'off', description: 'off' } as const;

            test('shows the number alone by default, with no ring', () => {
                const { container } = render(
                    <DashboardWidget
                        widget={statWidget(noIcon, 'overdue')}
                        data={busyData}
                    />,
                );

                expect(screen.getByText('2')).toBeInTheDocument();
                expect(container.querySelector('svg')).toBeNull();
            });

            test('shows a part of the whole with the share as a badge, or a ring when vivid', () => {
                const { container } = render(
                    <DashboardWidget
                        widget={statWidget(
                            { ...noIcon, show: 'fraction' },
                            'overdue',
                        )}
                        data={busyData}
                    />,
                );

                // Overdue is counted against the 4 open issues.
                expect(screen.getByText('/ 4')).toBeInTheDocument();
                expect(screen.getByText('50%')).toBeInTheDocument();
                expect(container.querySelector('svg')).toBeNull();

                cleanup();
                const vivid = render(
                    <DashboardWidget
                        widget={makeStat('overdue', {
                            variant: 'vivid',
                            config: { ...noIcon, show: 'fraction' },
                        })}
                        data={busyData}
                    />,
                );
                // In the vivid style the share is a ring.
                expect(
                    vivid.container.querySelector('svg circle'),
                ).not.toBeNull();
            });

            test('shows the share alone as a percent', () => {
                render(
                    <DashboardWidget
                        widget={statWidget(
                            { ...noIcon, show: 'percent' },
                            'assigned',
                        )}
                        data={busyData}
                    />,
                );

                // 3 of the 4 open issues.
                expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
            });

            test('critical and the open issues are a part of every issue', () => {
                render(
                    <DashboardWidget
                        widget={statWidget(
                            { ...noIcon, show: 'fraction', count: 'todo' },
                            'open_issues',
                        )}
                        data={busyData}
                    />,
                );

                expect(screen.getByText('To Do')).toBeInTheDocument();
                expect(screen.getByText('/ 8')).toBeInTheDocument();
            });

            test('the projects count is not a part of anything, so the format does not apply', () => {
                render(
                    <DashboardWidget
                        widget={statWidget(
                            { ...noIcon, show: 'percent' },
                            'projects',
                        )}
                        data={busyData}
                    />,
                );

                expect(screen.getByText('1')).toBeInTheDocument();
                expect(screen.queryByText(/%/)).not.toBeInTheDocument();
            });

            test('projects need no issue stats and do not wait for them', () => {
                render(
                    <DashboardWidget
                        widget={makeStat('projects')}
                        data={{ projects: [project(1), project(2)] }}
                    />,
                );

                expect(screen.getByText('2')).toBeInTheDocument();
                expect(
                    screen.queryByTestId('widget-placeholder'),
                ).not.toBeInTheDocument();
            });

            test('an unknown metric falls back to the open issues', () => {
                render(
                    <DashboardWidget
                        widget={statWidget({}, 'bogus')}
                        data={busyData}
                    />,
                );

                expect(screen.getByText('Open Issues')).toBeInTheDocument();
            });
        });

        test('a statistic can hide its icon and description', () => {
            const { container } = render(
                <DashboardWidget
                    widget={statWidget(
                        { icon: 'off', description: 'off' },
                        'critical',
                    )}
                    data={data}
                />,
            );

            expect(container.querySelector('svg')).toBeNull();
        });

        test('a statistic takes its variant and color from the widget', () => {
            const { container } = render(
                <DashboardWidget
                    widget={makeStat('critical', {
                        variant: 'outline',
                        config: { color: 'warning' },
                    })}
                    data={data}
                />,
            );

            expect(container.firstElementChild).toHaveClass('bg-transparent');
        });

        test('an unknown variant or color falls back to the defaults', () => {
            const { container } = render(
                <DashboardWidget
                    widget={makeStat('critical', {
                        variant: 'nope',
                        config: { color: 'pink' },
                    })}
                    data={data}
                />,
            );

            expect(container.firstElementChild).not.toHaveClass(
                'bg-transparent',
            );
        });

        test('the trend takes its color from the widget', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('trend', {
                        variant: 'line',
                        config: { color: 'info' },
                    })}
                    data={{
                        ...data,
                        productivity_trend: [{ day: 'Mon', count: 3 }],
                    }}
                />,
            );

            expect(screen.getByTestId('trend')).toHaveAttribute(
                'data-color',
                'info',
            );
        });

        test('the trend of an unknown color is drawn in the accent', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('trend', {
                        variant: 'line',
                        config: { color: 'pink' },
                    })}
                    data={{
                        ...data,
                        productivity_trend: [{ day: 'Mon', count: 3 }],
                    }}
                />,
            );

            expect(screen.getByTestId('trend')).toHaveAttribute(
                'data-color',
                'accent',
            );
        });

        test('the trend, completion and priority widgets pass their options on', () => {
            const trend = [{ day: 'Mon', count: 3 }];
            const full = { ...data, productivity_trend: trend };

            const { container, rerender } = render(
                <DashboardWidget
                    widget={makeWidget('completion', {
                        variant: 'stacked',
                        config: { header: 'off', tier: 'off' },
                    })}
                    data={full}
                />,
            );
            expect(
                screen.queryByText('Completion Ratio'),
            ).not.toBeInTheDocument();
            expect(screen.getAllByTestId('completion-segment')).toHaveLength(3);

            rerender(
                <DashboardWidget
                    widget={makeWidget('priority_breakdown', {
                        variant: 'list',
                        config: {
                            header: 'off',
                            noPriority: 'off',
                            percent: 'off',
                            sort: 'count',
                        },
                    })}
                    data={full}
                />,
            );
            expect(
                screen.getAllByTestId('priority-row-bar').length,
            ).toBeGreaterThan(0);
            expect(
                screen.queryByText('Priority Breakdown'),
            ).not.toBeInTheDocument();

            rerender(
                <DashboardWidget
                    widget={makeWidget('priority_breakdown', {
                        config: { sort: 'priority' },
                    })}
                    data={full}
                />,
            );
            expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
            expect(container).toBeTruthy();
        });

        test('the projects widget orders and trims its list from its options', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('projects', {
                        variant: 'compact',
                        config: {
                            limit: 3,
                            sort: 'name',
                            header: 'off',
                            viewAll: 'off',
                        },
                    })}
                    data={{ projects: [3, 1, 2, 4].map(project) }}
                />,
            );

            expect(
                screen.queryByText('Projects Directory'),
            ).not.toBeInTheDocument();
            expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
            expect(
                screen.getAllByText(/^Project \d$/).map((el) => el.textContent),
            ).toEqual(['Project 1', 'Project 2', 'Project 3']);
        });

        test('the activity widget passes its variant and options on', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('activity', {
                        variant: 'compact',
                        config: { header: 'off', pagination: 'off' },
                    })}
                    data={{ projects: [], activityLogs: makePaginated([]) }}
                />,
            );

            expect(screen.getByTestId('activity-feed')).toHaveAttribute(
                'data-compact',
                'true',
            );
        });
    });

    describe('the widgets of the second wave', () => {
        const stats = makeIssueStats({
            todo: 4,
            done: 2,
            overdue: 3,
            dueSoon: 5,
            assigned: 7,
            types: [
                {
                    name: 'Task',
                    color: '#3b82f6',
                    icon: 'CheckSquare',
                    count: 4,
                },
                { name: 'Bug', color: '#ef4444', icon: 'Bug', count: 2 },
            ],
        });
        const rows = [
            makeIssueRow(1, {
                title: 'Mine',
                assigneeId: 9,
                endDate: dateKeyOf(2),
            }),
            makeIssueRow(2, {
                title: 'Theirs',
                assigneeId: 4,
                endDate: dateKeyOf(3),
            }),
        ];
        const data = {
            issueStats: stats,
            projects: [project(1)],
            productivity_trend: [{ day: 'Mon', count: 3 }],
            myIssues: rows,
            deadlines: rows,
            auth: { user: { id: 9, name: 'Jane Cooper' } },
        };

        test.each([
            ['overdue', 'Overdue Issues', '3'],
            ['assigned', 'Assigned to Me', '7'],
            ['due_soon', 'Due Soon', '5'],
        ] as const)(
            'the %s statistic shows its number',
            (metric, title, value) => {
                render(
                    <DashboardWidget widget={makeStat(metric)} data={data} />,
                );

                expect(screen.getByText(title)).toBeInTheDocument();
                expect(screen.getByText(value)).toBeInTheDocument();
            },
        );

        test('the new stats take the same style and color options as the others', () => {
            const { container } = render(
                <DashboardWidget
                    widget={makeStat('overdue', {
                        variant: 'outline',
                        config: { icon: 'off', description: 'off' },
                    })}
                    data={data}
                />,
            );

            expect(container.firstElementChild).toHaveClass('bg-transparent');
            expect(container.querySelector('svg')).toBeNull();
        });

        test.each([
            'my_issues',
            'deadlines',
            'types_breakdown',
            'week_summary',
            'greeting',
        ] as const)('%s waits for its data with a placeholder', (type) => {
            render(
                <DashboardWidget
                    widget={makeWidget(type)}
                    data={{ projects: [] }}
                />,
            );

            expect(
                screen.getByTestId('widget-placeholder'),
            ).toBeInTheDocument();
        });

        test('my issues lists the issues of the user, trimmed to its limit and ordered by its option', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('my_issues', {
                        config: {
                            limit: 1,
                            sort: 'due',
                            header: 'on',
                            type: 'on',
                            project: 'on',
                            priority: 'on',
                            due: 'on',
                        },
                    })}
                    data={data}
                />,
            );

            expect(screen.getByText('My Issues')).toBeInTheDocument();
            expect(screen.getAllByRole('link')).toHaveLength(1);
            expect(screen.getByText('Mine')).toBeInTheDocument();
        });

        test('my issues hides what its options turn off', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('my_issues', {
                        config: {
                            limit: 5,
                            sort: 'priority',
                            header: 'off',
                            type: 'off',
                            project: 'off',
                            priority: 'off',
                            due: 'off',
                        },
                    })}
                    data={data}
                />,
            );

            expect(screen.queryByText('My Issues')).not.toBeInTheDocument();
            expect(screen.queryByTestId('due-chip')).not.toBeInTheDocument();
        });

        test('deadlines shows the issues of the user in the mine scope, and of everyone in the other', () => {
            const { rerender } = render(
                <DashboardWidget
                    widget={makeWidget('deadlines', {
                        config: {
                            scope: 'mine',
                            range: 30,
                            overdue: 'on',
                            limit: 10,
                            header: 'on',
                        },
                    })}
                    data={data}
                />,
            );
            expect(screen.getByText('Mine')).toBeInTheDocument();
            expect(screen.queryByText('Theirs')).not.toBeInTheDocument();

            rerender(
                <DashboardWidget
                    widget={makeWidget('deadlines', {
                        config: {
                            scope: 'all',
                            range: 30,
                            overdue: 'on',
                            limit: 10,
                            header: 'on',
                        },
                    })}
                    data={data}
                />,
            );
            expect(screen.getByText('Theirs')).toBeInTheDocument();
        });

        test('deadlines takes its style from the widget', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('deadlines', {
                        variant: 'timeline',
                        config: {
                            scope: 'all',
                            range: 30,
                            overdue: 'on',
                            limit: 10,
                            header: 'on',
                        },
                    })}
                    data={data}
                />,
            );

            expect(
                screen.getByRole('list', { name: 'Deadlines by day' }),
            ).toBeInTheDocument();
        });

        test('the issue types are drawn like a breakdown with their own title', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('types_breakdown')}
                    data={data}
                />,
            );

            expect(screen.getByText('Issue Types')).toBeInTheDocument();
            expect(screen.getByText('Task')).toBeInTheDocument();
            expect(screen.getByText('Bug')).toBeInTheDocument();
            expect(
                screen.queryByText('Priority Breakdown'),
            ).not.toBeInTheDocument();
        });

        test('the issue types can be ordered by name', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('types_breakdown', {
                        variant: 'list',
                        config: { header: 'on', percent: 'on', sort: 'name' },
                    })}
                    data={data}
                />,
            );

            expect(
                screen.getAllByText(/^(Task|Bug)$/).map((el) => el.textContent),
            ).toEqual(['Bug', 'Task']);
        });

        test('the week summary reads the trend and its options', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('week_summary', {
                        config: {
                            header: 'on',
                            average: 'off',
                            best: 'off',
                            color: 'success',
                        },
                    })}
                    data={data}
                />,
            );

            expect(screen.getByText('Week Summary')).toBeInTheDocument();
            expect(screen.queryByText('Daily average')).not.toBeInTheDocument();
        });

        test('the quick actions need no data and show only the actions that are on', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('quick_actions', {
                        config: {
                            header: 'on',
                            labels: 'on',
                            color: 'accent',
                            newProject: 'on',
                            search: 'off',
                            projects: 'off',
                            notifications: 'off',
                            editDashboard: 'off',
                            shortcuts: 'on',
                        },
                    })}
                    data={{ projects: [] }}
                />,
            );

            expect(
                screen
                    .getAllByRole('button')
                    .map((b) => b.getAttribute('title')),
            ).toEqual(['New project', 'Shortcuts']);
        });

        test('the keyboard shortcuts action is off until its option says so', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('quick_actions')}
                    data={{ projects: [] }}
                />,
            );

            expect(
                screen.queryByRole('button', { name: 'Shortcuts' }),
            ).not.toBeInTheDocument();
            expect(screen.getAllByRole('button')).toHaveLength(5);
        });

        test('the welcome greets the user by name with the day in numbers', () => {
            render(
                <DashboardWidget widget={makeWidget('greeting')} data={data} />,
            );

            expect(screen.getByRole('heading')).toHaveTextContent(
                /Good (morning|afternoon|evening|night), Jane/,
            );
            expect(screen.getByText('7 assigned to you')).toBeInTheDocument();
            expect(screen.getByText('3 overdue')).toBeInTheDocument();
        });

        test('the welcome follows its options', () => {
            render(
                <DashboardWidget
                    widget={makeWidget('greeting', {
                        variant: 'compact',
                        config: {
                            name: 'off',
                            date: 'off',
                            summary: 'off',
                            icon: 'off',
                            color: 'info',
                        },
                    })}
                    data={data}
                />,
            );

            expect(screen.getByRole('heading')).toHaveTextContent(
                /^Good (morning|afternoon|evening|night)$/,
            );
            expect(
                screen.queryByTestId('greeting-icon'),
            ).not.toBeInTheDocument();
        });
    });
});
