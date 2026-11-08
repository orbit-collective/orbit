import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { makeWidget } from '@/tests/dashboardLayout';
import { makeIssueStats } from '@/tests/issueStats';
import { makePaginated } from '@/tests/paginated';
import { DashboardWidget as Widget } from '@/types/Dashboard';
import { Project } from '@/types/Projects';
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

vi.mock('@/Components/Molecules/ActivityFeedPanel/ActivityFeedPanel', () => ({
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
        ['stat_projects', 'Active Projects'],
        ['stat_open_issues', 'Open Issues'],
        ['stat_critical', 'Critical Tasks'],
        ['stat_resolution', 'Resolution Rate'],
    ] as const)('draws the %s stat card', (type, title) => {
        render(
            <DashboardWidget
                widget={widget({ type })}
                data={{ issueStats: stats, projects: [project(1)] }}
            />,
        );

        expect(screen.getByText(title)).toBeInTheDocument();
    });

    test('computes the resolution rate from the issue counts', () => {
        render(
            <DashboardWidget
                widget={widget({ type: 'stat_resolution' })}
                data={{ issueStats: stats, projects: [] }}
            />,
        );

        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    });

    test('shows a placeholder while the data of a widget has not arrived', () => {
        const types = [
            'stat_open_issues',
            'stat_critical',
            'stat_resolution',
            'trend',
            'completion',
            'priority_breakdown',
            'activity',
        ] as const;

        for (const type of types) {
            const { unmount } = render(
                <DashboardWidget
                    widget={widget({ type })}
                    data={{ projects: [] }}
                />,
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
            type: Widget['type'] = 'stat_open_issues',
        ) => makeWidget(type, { config });

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
                    widget={statWidget({ show: 'count' }, 'stat_resolution')}
                    data={data}
                />,
            );

            expect(screen.getByText('/ 4')).toBeInTheDocument();
        });

        test('a statistic can hide its icon and description', () => {
            const { container } = render(
                <DashboardWidget
                    widget={statWidget(
                        { icon: 'off', description: 'off' },
                        'stat_critical',
                    )}
                    data={data}
                />,
            );

            expect(container.querySelector('svg')).toBeNull();
        });

        test('a statistic takes its variant and color from the widget', () => {
            const { container } = render(
                <DashboardWidget
                    widget={makeWidget('stat_critical', {
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
                    widget={makeWidget('stat_critical', {
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
});
