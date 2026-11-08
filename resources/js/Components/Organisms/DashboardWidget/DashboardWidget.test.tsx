import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
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
    default: ({ activityLogs }: { activityLogs: { total: number } }) => (
        <div data-testid="activity-feed" data-total={activityLogs.total} />
    ),
}));

vi.mock(
    '@/Components/Molecules/ProductivityTrendCard/ProductivityTrendCard',
    () => ({
        ProductivityTrendCard: ({ trendData }: { trendData: unknown[] }) => (
            <div data-testid="trend" data-points={trendData.length} />
        ),
    }),
);

const widget = (overrides: Partial<Widget> = {}): Widget => ({
    id: 'w',
    type: 'trend',
    variant: 'default',
    span: 4,
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
});
