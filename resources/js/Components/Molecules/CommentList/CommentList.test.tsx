import { Comment } from '@/types/Issues';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import CommentList from './CommentList';

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: 1,
    issue_id: 1,
    user_id: 1,
    body: 'A comment',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    can_edit: false,
    can_delete: false,
    user: { id: 1, name: 'Jane Cooper' },
    ...overrides,
});

describe('CommentList Component', () => {
    test('renders "No activity yet." when there are no comments', () => {
        render(<CommentList comments={[]} />);

        expect(screen.getByText('No activity yet.')).toBeInTheDocument();
    });

    test('renders every comment', () => {
        render(
            <CommentList
                comments={[
                    makeComment({ id: 1, body: 'First' }),
                    makeComment({ id: 2, body: 'Second' }),
                ]}
            />,
        );

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
    });

    test('only shows the delete button for comments the server marked as deletable', () => {
        render(
            <CommentList
                comments={[
                    makeComment({ id: 1, body: 'Mine', can_delete: true }),
                    makeComment({
                        id: 2,
                        body: 'Someone else',
                        can_delete: false,
                    }),
                ]}
            />,
        );

        expect(
            screen.getAllByRole('button', { name: 'Delete comment' }),
        ).toHaveLength(1);
    });

    test('calls onDelete with the deleted comment', async () => {
        const handleDelete = vi.fn();
        const comment = makeComment({ id: 5, can_delete: true });
        render(<CommentList comments={[comment]} onDelete={handleDelete} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Delete comment' }),
        );

        expect(handleDelete).toHaveBeenCalledWith(comment);
    });
});

describe('CommentList image uploads', () => {
    test('an editable comment can have an image pasted into it', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/a.png');
        const onEdit = vi.fn();

        render(
            <CommentList
                comments={[makeComment({ body: 'Editable', can_edit: true })]}
                onEdit={onEdit}
                onImageUpload={onImageUpload}
            />,
        );

        await userEvent.click(screen.getByText('Editable'));

        const textarea = screen.getByRole('textbox');
        fireEvent.paste(textarea, {
            clipboardData: {
                files: [new File(['x'], 'shot.png', { type: 'image/png' })],
                items: [],
            } as unknown as DataTransfer,
        });

        expect(onImageUpload).toHaveBeenCalledWith(expect.any(File));
        await waitFor(() =>
            expect(textarea).toHaveValue('Editable![shot.png](/storage/a.png)'),
        );
    });
});
