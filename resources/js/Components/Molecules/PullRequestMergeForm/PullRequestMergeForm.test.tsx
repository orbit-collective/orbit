import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import PullRequestMergeForm from './PullRequestMergeForm';

const renderForm = (
    overrides: Partial<Parameters<typeof PullRequestMergeForm>[0]> = {},
) => {
    const props = {
        number: 7,
        title: 'Add login redirect',
        busy: false,
        onMerge: vi.fn().mockResolvedValue(true),
        onCancel: vi.fn(),
        ...overrides,
    };
    render(<PullRequestMergeForm {...props} />);

    return props;
};

describe('PullRequestMergeForm', () => {
    test('starts with a merge commit and explains what each method does', async () => {
        renderForm();

        expect(
            screen.getByRole('button', { name: 'Merge commit' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByText(
                'All commits are kept and joined by a merge commit.',
            ),
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Squash' }));
        expect(
            screen.getByText(
                'All commits become one commit on the base branch.',
            ),
        ).toBeInTheDocument();
    });

    test("merges with GitHub's default commit titles", async () => {
        const props = renderForm();
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm merge commit' }),
        );
        expect(props.onMerge).toHaveBeenLastCalledWith({
            method: 'merge',
            commitTitle: 'Merge pull request #7',
        });

        await userEvent.click(screen.getByRole('button', { name: 'Squash' }));
        expect(screen.getByLabelText('Commit title')).toHaveValue(
            'Add login redirect (#7)',
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm squash and merge' }),
        );
        expect(props.onMerge).toHaveBeenLastCalledWith({
            method: 'squash',
            commitTitle: 'Add login redirect (#7)',
        });
    });

    test("takes an edited title, and a changed method goes back to that method's default", async () => {
        const props = renderForm();
        const field = screen.getByLabelText('Commit title');

        await userEvent.clear(field);
        await userEvent.type(field, 'Ship login');
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm merge commit' }),
        );
        expect(props.onMerge).toHaveBeenLastCalledWith({
            method: 'merge',
            commitTitle: 'Ship login',
        });

        await userEvent.click(screen.getByRole('button', { name: 'Squash' }));
        expect(field).toHaveValue('Add login redirect (#7)');
    });

    test('a rebase keeps the commits as they are, so it takes no title', async () => {
        const props = renderForm();

        await userEvent.click(screen.getByRole('button', { name: 'Rebase' }));
        expect(screen.queryByLabelText('Commit title')).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm rebase and merge' }),
        );

        expect(props.onMerge).toHaveBeenCalledWith({ method: 'rebase' });
    });

    test('remembers the method', async () => {
        const { unmount } = render(
            <PullRequestMergeForm
                number={1}
                title="x"
                busy={false}
                onMerge={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Squash' }));
        unmount();

        renderForm();

        expect(screen.getByRole('button', { name: 'Squash' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    test('will not merge with an empty title, or while busy', async () => {
        const props = renderForm();

        await userEvent.clear(screen.getByLabelText('Commit title'));
        expect(
            screen.getByRole('button', { name: 'Confirm merge commit' }),
        ).toBeDisabled();
        expect(props.onMerge).not.toHaveBeenCalled();
    });

    test('shows it is merging, and backs out with Cancel or Escape', async () => {
        const props = renderForm({ busy: true });
        expect(screen.getByRole('button', { name: 'Merging…' })).toBeDisabled();

        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        screen.getByLabelText('Commit title').focus();
        await userEvent.keyboard('{Escape}');

        expect(props.onCancel).toHaveBeenCalledTimes(2);
    });
});
