import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { makeIssueStats } from '@/tests/issueStats';
import { makePaginated } from '@/tests/paginated';
import { ActivityLogEntry } from '@/types/ActivityLog';
import { IssueStats, ProductivityTrendProps } from '@/types/Issues';
import { Project } from '@/types/Projects';
import Dashboard from './Dashboard';

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({
        runCommand: vi.fn(),
    }),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

vi.mock('@/Components/Organisms/Sidebar/Sidebar', () => ({
    default: ({ projects }: { projects: Project[] }) => (
        <div data-testid="sidebar" data-projects-count={projects.length} />
    ),
}));

vi.mock('@/Components/Organisms/PageHeader/PageHeader', () => ({
    default: ({
        title,
        children,
    }: {
        title: string;
        children?: React.ReactNode;
    }) => (
        <div data-testid="page-header" data-title={title}>
            {children}
        </div>
    ),
}));

vi.mock('@/Components/Organisms/DashboardVisuals/DashboardVisuals', () => ({
    default: ({
        stats,
        productivity_trend,
    }: {
        stats: IssueStats;
        productivity_trend: ProductivityTrendProps[];
    }) => (
        <div
            data-testid="dashboard-visuals"
            data-issues-count={stats.total}
            data-trend-count={productivity_trend.length}
        />
    ),
}));

vi.mock('@/Components/Molecules/Pagination/Pagination', () => ({
    default: ({
        from,
        to,
        total,
        pageParam,
        perPageParam,
        defaultPerPage,
        preserveState,
    }: {
        from: number;
        to: number;
        total: number;
        pageParam?: string;
        perPageParam?: string;
        defaultPerPage?: number;
        preserveState?: boolean;
    }) => (
        <div
            data-testid="pagination"
            data-from={from}
            data-to={to}
            data-total={total}
            data-page-param={pageParam}
            data-per-page-param={perPageParam}
            data-default-per-page={defaultPerPage}
            data-preserve-state={String(preserveState)}
        />
    ),
}));

vi.mock('@/Components/Organisms/ActivityLogs/ActivityLogs', () => ({
    default: ({ logs }: { logs: ActivityLogEntry[] }) => (
        <div data-testid="activity-logs" data-logs-count={logs.length} />
    ),
}));

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
    ...overrides,
});

describe('Dashboard Page', () => {
    test('renders the Sidebar with the provided projects and a Dashboard page header', () => {
        const projects = [makeProject({ id: 1 }), makeProject({ id: 2 })];
        render(
            <Dashboard
                issueStats={makeIssueStats()}
                projects={projects}
                productivity_trend={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(screen.getByTestId('sidebar')).toHaveAttribute(
            'data-projects-count',
            '2',
        );
        expect(screen.getByTestId('page-header')).toHaveAttribute(
            'data-title',
            'Dashboard',
        );
    });

    test('computes stat card values from the issue counts', () => {
        const issueStats = makeIssueStats({
            high: 2,
            medium: 1,
            low: 1,
            todo: 2,
            done: 2,
        });
        render(
            <Dashboard
                issueStats={issueStats}
                projects={[makeProject()]}
                productivity_trend={[]}
                activityLogs={makePaginated([])}
            />,
        );

        // 4 total, 2 closed => 2 open.
        expect(screen.getByText('Open Issues')).toBeInTheDocument();
        expect(screen.getAllByText('2')).not.toHaveLength(0);
        // 2 high priority issues => Critical Tasks value of 2.
        expect(screen.getByText('Critical Tasks')).toBeInTheDocument();
        // 2/4 closed => 50% resolution rate (rendered as both the stat
        // value and the progress bar percentage label).
        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
        // 1 project => Active Projects value of 1.
        expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });

    test('shows 0% resolution rate when there are no issues', () => {
        render(
            <Dashboard
                issueStats={makeIssueStats()}
                projects={[]}
                productivity_trend={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    });

    test('forwards the stats and productivity_trend to DashboardVisuals', () => {
        const issueStats = makeIssueStats({ todo: 2 });
        const trend = [{ day: 'Mon', count: 3 }];
        render(
            <Dashboard
                issueStats={issueStats}
                projects={[]}
                productivity_trend={trend}
                activityLogs={makePaginated([])}
            />,
        );

        const visuals = screen.getByTestId('dashboard-visuals');
        expect(visuals).toHaveAttribute('data-issues-count', '2');
        expect(visuals).toHaveAttribute('data-trend-count', '1');
    });

    test('forwards activityLogs to ActivityLogs', () => {
        const activityLogs: ActivityLogEntry[] = [
            {
                id: 1,
                body: 'Created project: Orbit',
                userId: 1,
                userName: 'Jane Doe',
                userAvatar: null,
                createdAt: '2026-01-01T10:00:00Z',
            },
        ];
        render(
            <Dashboard
                issueStats={makeIssueStats()}
                projects={[]}
                productivity_trend={[]}
                activityLogs={makePaginated(activityLogs, {
                    from: 11,
                    to: 11,
                    total: 11,
                })}
            />,
        );

        expect(screen.getByTestId('activity-logs')).toHaveAttribute(
            'data-logs-count',
            '1',
        );
        const pagination = screen.getByTestId('pagination');
        expect(pagination).toHaveAttribute('data-from', '11');
        expect(pagination).toHaveAttribute('data-to', '11');
        expect(pagination).toHaveAttribute('data-total', '11');
        expect(pagination).toHaveAttribute('data-page-param', 'activityPage');
        expect(pagination).toHaveAttribute(
            'data-per-page-param',
            'activityPerPage',
        );
        expect(pagination).toHaveAttribute('data-default-per-page', '10');
        expect(pagination).toHaveAttribute('data-preserve-state', 'true');
    });

    test('renders up to 3 projects and a "view all" link when there are more', () => {
        const projects = [
            makeProject({ id: 1, name: 'Project One' }),
            makeProject({ id: 2, name: 'Project Two' }),
            makeProject({ id: 3, name: 'Project Three' }),
            makeProject({ id: 4, name: 'Project Four' }),
        ];
        render(
            <Dashboard
                issueStats={makeIssueStats()}
                projects={projects}
                productivity_trend={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(screen.getByText('Project One')).toBeInTheDocument();
        expect(screen.getByText('Project Two')).toBeInTheDocument();
        expect(screen.getByText('Project Three')).toBeInTheDocument();
        expect(screen.queryByText('Project Four')).not.toBeInTheDocument();

        const viewAllLink = screen.getByText('View all 4 projects');
        expect(viewAllLink.closest('a')).toHaveAttribute('href', '/projects');
    });

    test('does not render a "view all" link when there are 3 or fewer projects', () => {
        render(
            <Dashboard
                issueStats={makeIssueStats()}
                projects={[makeProject({ id: 1 })]}
                productivity_trend={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
    });

    test('renders an empty state when there are no projects', () => {
        render(
            <Dashboard
                issueStats={makeIssueStats()}
                projects={[]}
                productivity_trend={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(
            screen.getByText('Create your first project'),
        ).toBeInTheDocument();
    });
});
