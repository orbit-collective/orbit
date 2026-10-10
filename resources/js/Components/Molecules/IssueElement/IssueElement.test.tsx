import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Issue } from '@/types/Issues';
import IssueElement from './IssueElement';

const mockRouterDelete = vi.fn();
const mockRouterVisit = vi.fn();
vi.mock('@inertiajs/react', () => ({
    router: {
        delete: (...args: unknown[]) => mockRouterDelete(...args),
        visit: (...args: unknown[]) => mockRouterVisit(...args),
    },
}));

vi.stubGlobal(
    'route',
    vi.fn((name: string, params: unknown) =>
        Array.isArray(params)
            ? `/${name}/${params.join('/')}`
            : `/${name}/${params}`,
    ),
);

const makeAssignee = (name = 'Jane Doe') => ({
    avatar: '/jane.png',
    created_at: '',
    email: 'jane@acme.com',
    id: 1,
    name,
    password: '',
    updated_at: '',
});

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: 'ISSUE-1',
    title: 'Fix the bug',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    labels: ['bug'],
    assignee: makeAssignee(),
    ...overrides,
});

const renderInTable = (ui: React.ReactElement) =>
    render(
        <table>
            <tbody>{ui}</tbody>
        </table>,
    );

describe('IssueElement Component', () => {
    describe('board layout', () => {
        test('renders the title and assignee name', () => {
            render(<IssueElement issue={makeIssue()} type="board" />);

            expect(screen.getByText('Fix the bug')).toBeInTheDocument();
            expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        });

        test('shows "Unassigned" and a placeholder when there is no assignee', () => {
            render(
                <IssueElement
                    issue={makeIssue({ assignee: undefined })}
                    type="board"
                />,
            );

            expect(screen.getByText('Unassigned')).toBeInTheDocument();
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        });

        test('renders the issue labels', () => {
            render(
                <IssueElement
                    issue={makeIssue({ labels: ['bug', 'feature'] })}
                    type="board"
                />,
            );

            expect(screen.getAllByText('feature')[0]).toBeInTheDocument();
        });

        test('navigates to the issue page when clicked', async () => {
            const issue = makeIssue();
            render(<IssueElement issue={issue} type="board" />);

            await userEvent.click(screen.getByText('Fix the bug'));

            expect(mockRouterVisit).toHaveBeenCalledWith(
                '/issues.show/1/ISSUE-1',
            );
        });

        test('applies closed (line-through) styling for closed issues', () => {
            render(
                <IssueElement
                    issue={makeIssue({ status: 'closed' })}
                    type="board"
                />,
            );

            expect(screen.getByText('Fix the bug')).toHaveClass('line-through');
        });
    });

    describe('list layout (default)', () => {
        test('renders the id, title and priority in a table row', () => {
            renderInTable(<IssueElement issue={makeIssue()} />);

            expect(screen.getByText(/ISSUE-1/)).toBeInTheDocument();
            expect(screen.getByText('Fix the bug')).toBeInTheDocument();
            expect(screen.getAllByText('high').length).toBeGreaterThan(0);
        });

        test('renders the assignee name via the user badge', () => {
            renderInTable(<IssueElement issue={makeIssue()} />);

            expect(screen.getAllByText('Jane Doe')).toHaveLength(2);
        });

        test('renders "Unassigned" when there is no assignee', () => {
            renderInTable(
                <IssueElement issue={makeIssue({ assignee: undefined })} />,
            );

            expect(screen.getAllByText('Unassigned')).toHaveLength(2);
        });

        test('navigates to the issue page when the row is clicked', async () => {
            const issue = makeIssue();
            renderInTable(<IssueElement issue={issue} />);

            await userEvent.click(screen.getByText('Fix the bug'));

            expect(mockRouterVisit).toHaveBeenCalledWith(
                '/issues.show/1/ISSUE-1',
            );
        });

        test('deletes the issue via the destroy route when Remove is clicked', async () => {
            const issue = makeIssue();
            renderInTable(<IssueElement issue={issue} />);

            const row = screen
                .getByText('Fix the bug')
                .closest('tr') as HTMLElement;
            fireEvent.contextMenu(row);

            await userEvent.click(screen.getByText('Remove'));

            expect(mockRouterDelete).toHaveBeenCalledWith(
                '/issues.destroy/ISSUE-1',
            );
        });
    });
});
