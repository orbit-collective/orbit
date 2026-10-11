import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SavedFilter } from '@/hooks/useSavedFilters';
import { makePaginated } from '@/tests/paginated';
import { Issue, IssuePageLooks } from '@/types/Issues';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import Show from './Show';

vi.mock('@/Layouts/MainLayout', () => ({
    default: ({
        children,
        selectedLook,
        setSelectedLook,
        project,
        projects,
        users,
    }: {
        children: React.ReactNode;
        selectedLook: IssuePageLooks;
        setSelectedLook: (look: IssuePageLooks) => void;
        project: Project;
        projects: Project[];
        users: AssignableUser[];
    }) => (
        <div
            data-testid="main-layout"
            data-selected-look={selectedLook}
            data-project-name={project.name}
            data-projects-count={projects.length}
            data-users-count={users.length}
        >
            <button onClick={() => setSelectedLook('List')}>
                Switch to List
            </button>
            <button onClick={() => setSelectedLook('Board')}>
                Switch to Board
            </button>
            <button onClick={() => setSelectedLook('Calendar')}>
                Switch to Calendar
            </button>
            {children}
        </div>
    ),
}));

vi.mock('@/Components/Organisms/FilterBar/FilterBar', () => ({
    default: ({
        queryParams,
        project,
        savedFilters,
        users,
    }: {
        queryParams?: Record<string, unknown>;
        project: Project;
        savedFilters: SavedFilter[];
        users: AssignableUser[];
    }) => (
        <div
            data-testid="filter-bar"
            data-project-name={project.name}
            data-saved-filters-count={savedFilters.length}
            data-users-count={users.length}
            data-query-params={JSON.stringify(queryParams ?? {})}
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
    default: ({ logs }: { logs: { id: number }[] }) => (
        <div data-testid="activity-logs" data-logs-count={logs.length} />
    ),
}));

vi.mock('@/Components/Organisms/IssueTable/IssueTable', () => ({
    default: ({
        issues,
        pagination,
    }: {
        issues: Issue[];
        pagination?: React.ReactNode;
    }) => (
        <div data-testid="issue-table" data-issues-count={issues.length}>
            {pagination}
        </div>
    ),
}));

vi.mock('@/Components/Organisms/IssueBoard/IssueBoard', () => ({
    default: ({ issues }: { issues: Issue[] }) => (
        <div data-testid="issue-board" data-issues-count={issues.length} />
    ),
}));

vi.mock('@/Components/Organisms/CalendarView/CalendarView', () => ({
    default: ({ issues }: { issues: Issue[] }) => (
        <div data-testid="calendar-view" data-issues-count={issues.length} />
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

let issueId = 0;
const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: `ISSUE-${issueId++}`,
    title: 'An issue',
    status: 'open',
    priority: 'medium',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

const makeUser = (overrides: Partial<AssignableUser> = {}): AssignableUser => ({
    id: 1,
    name: 'Jane Doe',
    ...overrides,
});

describe('Projects Show Page', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('renders FilterBar and MainLayout with the wired project/filters/users data', () => {
        const project = makeProject({ name: 'Roadmap' });
        const savedFilters: SavedFilter[] = [
            {
                id: 1,
                project_id: 1,
                name: 'My filter',
                context: 'project_1',
                query_params: {},
            },
        ];
        render(
            <Show
                project={project}
                issues={makePaginated([])}
                projects={[project]}
                savedFilters={savedFilters}
                users={[makeUser()]}
                activityLogs={makePaginated([])}
            />,
        );

        const layout = screen.getByTestId('main-layout');
        expect(layout).toHaveAttribute('data-project-name', 'Roadmap');
        expect(layout).toHaveAttribute('data-projects-count', '1');
        expect(layout).toHaveAttribute('data-users-count', '1');

        const filterBar = screen.getByTestId('filter-bar');
        expect(filterBar).toHaveAttribute('data-project-name', 'Roadmap');
        expect(filterBar).toHaveAttribute('data-saved-filters-count', '1');
        expect(filterBar).toHaveAttribute('data-users-count', '1');
    });

    test('defaults to the List view and renders IssueTable with its pagination', () => {
        const issues = [makeIssue()];
        render(
            <Show
                project={makeProject()}
                issues={makePaginated(issues, { from: 1, to: 1, total: 1 })}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(screen.getByTestId('main-layout')).toHaveAttribute(
            'data-selected-look',
            'List',
        );
        expect(screen.getByTestId('issue-table')).toHaveAttribute(
            'data-issues-count',
            '1',
        );
        const pagination = screen.getByTestId('pagination');
        expect(pagination).toHaveAttribute('data-from', '1');
        expect(pagination).toHaveAttribute('data-to', '1');
        expect(pagination).toHaveAttribute('data-total', '1');
        expect(screen.queryByTestId('issue-board')).not.toBeInTheDocument();
        expect(screen.queryByTestId('calendar-view')).not.toBeInTheDocument();
    });

    test('reads the initial view from localStorage when valid', () => {
        localStorage.setItem('selectedLook', 'Board');
        render(
            <Show
                project={makeProject()}
                issues={makePaginated([])}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(screen.getByTestId('main-layout')).toHaveAttribute(
            'data-selected-look',
            'Board',
        );
        expect(screen.getByTestId('issue-board')).toBeInTheDocument();
    });

    test('falls back to List when localStorage has an invalid value', () => {
        localStorage.setItem('selectedLook', 'Nonsense');
        render(
            <Show
                project={makeProject()}
                issues={makePaginated([])}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
            />,
        );

        expect(screen.getByTestId('main-layout')).toHaveAttribute(
            'data-selected-look',
            'List',
        );
    });

    test('switches to the Board view, renders IssueBoard + Pagination, and persists the choice', async () => {
        const user = userEvent.setup();
        const issues = [makeIssue()];
        render(
            <Show
                project={makeProject()}
                issues={makePaginated(issues, { from: 1, to: 1, total: 1 })}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Switch to Board' }),
        );

        expect(screen.getByTestId('main-layout')).toHaveAttribute(
            'data-selected-look',
            'Board',
        );
        expect(screen.getByTestId('issue-board')).toBeInTheDocument();
        expect(screen.getByTestId('pagination')).toBeInTheDocument();
        expect(screen.queryByTestId('issue-table')).not.toBeInTheDocument();
    });

    test('switches to the Calendar view and hides pagination', async () => {
        const user = userEvent.setup();
        render(
            <Show
                project={makeProject()}
                issues={makePaginated([makeIssue()])}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Switch to Calendar' }),
        );

        expect(screen.getByTestId('main-layout')).toHaveAttribute(
            'data-selected-look',
            'Calendar',
        );
        expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
        expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });

    test('renders the upcoming deadlines panel alongside the calendar', async () => {
        const user = userEvent.setup();
        render(
            <Show
                project={makeProject()}
                issues={makePaginated([makeIssue()])}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Switch to Calendar' }),
        );

        expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
    });

    test('gives the calendar the full unpaginated project issue set, not the current table page', async () => {
        const user = userEvent.setup();
        render(
            <Show
                project={makeProject()}
                issues={makePaginated([makeIssue(), makeIssue()])}
                calendarIssues={[makeIssue(), makeIssue(), makeIssue()]}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Switch to Calendar' }),
        );

        expect(screen.getByTestId('calendar-view')).toHaveAttribute(
            'data-issues-count',
            '3',
        );
    });

    test('forwards queryParams to FilterBar and IssueTable', () => {
        const queryParams = {
            sort: 'title' as const,
            direction: 'AZ' as const,
        };
        render(
            <Show
                project={makeProject()}
                issues={makePaginated([])}
                projects={[]}
                savedFilters={[]}
                users={[]}
                activityLogs={makePaginated([])}
                queryParams={queryParams}
            />,
        );

        expect(screen.getByTestId('filter-bar')).toHaveAttribute(
            'data-query-params',
            JSON.stringify(queryParams),
        );
    });

    test('renders the activity view with a pager on the activity page params', () => {
        localStorage.setItem('selectedLook', 'Activity');
        const project = makeProject();
        const entry = (id: number) => ({
            id,
            body: 'Created project: Roadmap',
            userId: 1,
            userName: 'Jane Doe',
            userAvatar: null,
            createdAt: '2026-01-01T10:00:00Z',
        });
        render(
            <Show
                project={project}
                issues={makePaginated([])}
                projects={[project]}
                savedFilters={[]}
                users={[makeUser()]}
                activityLogs={makePaginated([entry(1), entry(2)], {
                    from: 21,
                    to: 22,
                    total: 42,
                })}
            />,
        );

        expect(screen.getByTestId('activity-logs')).toHaveAttribute(
            'data-logs-count',
            '2',
        );
        const pagination = screen.getByTestId('pagination');
        expect(pagination).toHaveAttribute('data-from', '21');
        expect(pagination).toHaveAttribute('data-to', '22');
        expect(pagination).toHaveAttribute('data-total', '42');
        expect(pagination).toHaveAttribute('data-page-param', 'activityPage');
        expect(pagination).toHaveAttribute(
            'data-per-page-param',
            'activityPerPage',
        );
        expect(pagination).toHaveAttribute('data-default-per-page', '20');
        // Page links must not remount Show, or the Activity view would reset to the default look.
        expect(pagination).toHaveAttribute('data-preserve-state', 'true');
        expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument();
    });
});
