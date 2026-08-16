import { Issue } from '@/types/Issues';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { BoardCard, BoardCardOverlay } from './BoardCard';

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: 'ISSUE-1',
    title: 'Fix the login page',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

describe('BoardCard Component', () => {
    test('renders the issue title', () => {
        render(
            <BoardCard
                issue={makeIssue({ title: 'Improve dashboard load time' })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(
            screen.getByText('Improve dashboard load time'),
        ).toBeInTheDocument();
    });

    test('shows "Unassigned" when the issue has no assignee', () => {
        render(
            <BoardCard
                issue={makeIssue({ assignee: undefined })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    test('shows the assignee name and avatar when present', () => {
        render(
            <BoardCard
                issue={makeIssue({
                    assignee: {
                        id: 1,
                        name: 'Jane Doe',
                        email: 'jane@acme.com',
                        avatar: 'jane.png',
                        created_at: '',
                        updated_at: '',
                    },
                })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByAltText('Jane Doe')).toHaveAttribute(
            'src',
            'jane.png',
        );
    });

    test('renders a placeholder avatar block when unassigned', () => {
        const { container } = render(
            <BoardCard
                issue={makeIssue({ assignee: undefined })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(container.querySelector('img')).not.toBeInTheDocument();
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    test('renders the issue status as a badge', () => {
        render(
            <BoardCard
                issue={makeIssue({ status: 'open' })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(screen.getAllByText('open').length).toBeGreaterThanOrEqual(1);
    });

    test('renders the in_progress status badge without an underscore', () => {
        render(
            <BoardCard
                issue={makeIssue({ status: 'in_progress' })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(screen.getByText('in progress')).toBeInTheDocument();
        expect(screen.queryByText('in_progress')).not.toBeInTheDocument();
    });

    test('renders labels via LabelList when present', () => {
        render(
            <BoardCard
                issue={makeIssue({ labels: ['bug', 'design'] })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(screen.getAllByText('bug').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('design').length).toBeGreaterThanOrEqual(1);
    });

    test('renders no label badges when the issue has no labels', () => {
        render(
            <BoardCard
                issue={makeIssue({ labels: [] })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        expect(screen.queryByText('bug')).not.toBeInTheDocument();
    });

    test('calls onClick when the card is clicked', async () => {
        const handleClick = vi.fn();
        render(
            <BoardCard
                issue={makeIssue()}
                isClosed={false}
                onClick={handleClick}
            />,
        );

        await userEvent.click(screen.getByText('Fix the login page'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('applies muted/opacity styling and a line-through title when closed', () => {
        render(
            <BoardCard
                issue={makeIssue()}
                isClosed={true}
                onClick={() => {}}
            />,
        );

        const title = screen.getByText('Fix the login page');
        expect(title).toHaveClass('line-through');
        expect(title).toHaveClass('text-[var(--text-muted-color)]');
    });

    test('shows the priority dot when the issue is open, and the status dot when closed', () => {
        const { container, rerender } = render(
            <BoardCard
                issue={makeIssue({ priority: 'high', status: 'open' })}
                isClosed={false}
                onClick={() => {}}
            />,
        );

        // Not closed: the leading dot reflects priority ("high").
        expect(
            container.querySelector('.bg-\\[var\\(--error-color\\)\\]'),
        ).toBeInTheDocument();

        rerender(
            <BoardCard
                issue={makeIssue({ priority: 'high', status: 'open' })}
                isClosed={true}
                onClick={() => {}}
            />,
        );

        // Closed: the leading dot reflects status ("open") rather than priority.
        expect(
            container.querySelector('.bg-\\[var\\(--info-color\\)\\]'),
        ).toBeInTheDocument();
    });
});

describe('BoardCardOverlay Component', () => {
    test('renders the issue content for the dragged card preview', () => {
        render(
            <BoardCardOverlay
                issue={makeIssue({ title: 'Dragging this card' })}
                isClosed={false}
            />,
        );

        expect(screen.getByText('Dragging this card')).toBeInTheDocument();
    });
});
