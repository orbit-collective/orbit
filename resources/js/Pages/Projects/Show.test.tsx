import { SavedFilter } from '@/hooks/useSavedFilters';
import { Issue, IssuePageLooks, PaginatedResponse } from '@/types/Issues';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
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
    }: {
        from: number;
        to: number;
        total: number;
    }) => (
        <div
            data-testid="pagination"
            data-from={from}
            data-to={to}
            data-total={total}
        />
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

const makePaginated = (
    data: Issue[],
    overrides: Partial<PaginatedResponse<Issue>> = {},
): PaginatedResponse<Issue> => ({
    current_page: 1,
    data,
    first_page_url: '/projects/1?page=1',
    from: 1,
    last_page: 1,
    last_page_url: '/projects/1?page=1',
    links: [],
    next_page_url: null,
    path: '/projects/1',
    per_page: 20,
    prev_page_url: null,
    to: data.length,
    total: data.length,
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
                queryParams={queryParams}
            />,
        );

        expect(screen.getByTestId('filter-bar')).toHaveAttribute(
            'data-query-params',
            JSON.stringify(queryParams),
        );
    });
});
