import { Comment } from '@/types/Issues';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import CommentItem from './CommentItem';

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: 1,
    issue_id: 1,
    user_id: 1,
    body: 'Looks good to me',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    can_edit: false,
    can_delete: false,
    user: { id: 1, name: 'Jane Cooper' },
    ...overrides,
});

describe('CommentItem Component', () => {
    test('renders the author name and body', () => {
        render(<CommentItem comment={makeComment()} />);

        expect(screen.getByText('Jane Cooper')).toBeInTheDocument();
        expect(screen.getByText('Looks good to me')).toBeInTheDocument();
    });

    test('renders "Unknown" when the comment has no user relation', () => {
        render(<CommentItem comment={makeComment({ user: undefined })} />);

        expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    test('does not render a delete button when can_delete is false', () => {
        render(<CommentItem comment={makeComment()} />);

        expect(
            screen.queryByRole('button', { name: 'Delete comment' }),
        ).not.toBeInTheDocument();
    });

    test('renders a delete button when can_delete is true', () => {
        render(<CommentItem comment={makeComment({ can_delete: true })} />);

        expect(
            screen.getByRole('button', { name: 'Delete comment' }),
        ).toBeInTheDocument();
    });

    test('calls onDelete with the comment when the delete button is clicked', async () => {
        const handleDelete = vi.fn();
        const comment = makeComment({ can_delete: true });
        render(<CommentItem comment={comment} onDelete={handleDelete} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Delete comment' }),
        );

        expect(handleDelete).toHaveBeenCalledWith(comment);
    });

    test('the body is not editable when can_edit is false', () => {
        render(<CommentItem comment={makeComment({ can_edit: false })} />);

        expect(screen.getByText('Looks good to me')).toHaveAttribute(
            'tabindex',
            '-1',
        );
    });

    test('calls onEdit with the new body after editing', async () => {
        const handleEdit = vi.fn();
        const comment = makeComment({ can_edit: true });
        render(<CommentItem comment={comment} onEdit={handleEdit} />);

        const user = userEvent.setup();
        await user.click(screen.getByText('Looks good to me'));
        const textarea = screen.getByDisplayValue('Looks good to me');
        await user.clear(textarea);
        await user.type(textarea, 'Updated body');
        await user.tab();

        expect(handleEdit).toHaveBeenCalledWith(comment, 'Updated body');
    });
});
