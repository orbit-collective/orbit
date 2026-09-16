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

    test('highlights a mention token and resolves it by id', () => {
        const users = [{ id: 2, name: 'Bob Smith' }];
        render(
            <CommentItem
                comment={makeComment({
                    body: 'Hi @[Bob Smith](2), thanks!',
                })}
                users={users}
            />,
        );

        expect(screen.getByText('@Bob Smith')).toBeInTheDocument();
    });

    test('disambiguates two same-named members by the id in the token', () => {
        const users = [
            { id: 2, name: 'Bob Smith', avatar: '/wrong.jpg' },
            { id: 9, name: 'Bob Smith', avatar: '/right.jpg' },
        ];
        const { container } = render(
            <CommentItem
                comment={makeComment({ body: 'Hi @[Bob Smith](9)!' })}
                users={users}
            />,
        );

        const avatarImgs = container.querySelectorAll('img');
        expect(
            Array.from(avatarImgs).some(
                (img) => img.getAttribute('src') === '/right.jpg',
            ),
        ).toBe(true);
    });

    test('leaves plain "@word" text (no mention token) unhighlighted', () => {
        const users = [{ id: 2, name: 'Bob Smith' }];
        render(
            <CommentItem
                comment={makeComment({ body: 'Reach me at @nobody' })}
                users={users}
            />,
        );

        expect(screen.queryByText('@nobody')).not.toBeInTheDocument();
        expect(screen.getByText('Reach me at @nobody')).toBeInTheDocument();
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

describe('CommentItem image rendering', () => {
    test('renders a pasted markdown image as an image, not as text', () => {
        render(
            <CommentItem
                comment={makeComment({
                    body: 'Here it is ![shot.png](/storage/attachments/1/shot.png)',
                })}
            />,
        );

        const image = screen.getByRole('img', { name: 'shot.png' });
        expect(image).toHaveAttribute('src', '/storage/attachments/1/shot.png');
        expect(screen.getByText('Here it is')).toBeInTheDocument();
        expect(screen.queryByText(/!\[shot\.png\]/)).not.toBeInTheDocument();
    });

    test('links the image to the full-size file without starting an edit', async () => {
        const onEdit = vi.fn();
        render(
            <CommentItem
                comment={makeComment({
                    body: '![shot.png](/storage/a.png)',
                    can_edit: true,
                })}
                onEdit={onEdit}
            />,
        );

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/storage/a.png');
        expect(link).toHaveAttribute('target', '_blank');

        await userEvent.click(screen.getByRole('img', { name: 'shot.png' }));

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('still renders mentions in the text around an image', () => {
        render(
            <CommentItem
                comment={makeComment({
                    body: '@[Jane Cooper](1) look ![shot.png](/storage/a.png)',
                })}
                users={[{ id: 1, name: 'Jane Cooper' }]}
            />,
        );

        expect(screen.getByText('@Jane Cooper')).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'shot.png' }),
        ).toBeInTheDocument();
    });
});
