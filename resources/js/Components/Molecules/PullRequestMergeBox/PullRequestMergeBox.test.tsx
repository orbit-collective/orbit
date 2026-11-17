import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import PullRequestMergeBox from './PullRequestMergeBox';

const renderBox = (
    overrides: Partial<Parameters<typeof PullRequestMergeBox>[0]> = {},
) => {
    const props = {
        number: 7,
        title: 'Add login redirect',
        busy: false,
        onMerge: vi.fn().mockResolvedValue(true),
        ...overrides,
    };
    const view = render(<PullRequestMergeBox {...props} />);

    return { props, ...view };
};

const open = async () => {
    await userEvent.click(screen.getByRole('button', { name: /^Merge…/ }));
    await screen.findByRole('radiogroup');
};

describe('PullRequestMergeBox', () => {
    test('is one closed line: what it does and a button to open it', () => {
        renderBox();

        expect(
            screen.getByRole('form', { name: 'Merge pull request #7' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Merge this pull request')).toBeInTheDocument();
        expect(
            screen.getByText('Merges with: Merge commit'),
        ).toBeInTheDocument();
        const button = screen.getByRole('button', { name: /^Merge…/ });
        expect(button).toHaveAttribute('aria-expanded', 'false');
        // Nothing to merge with is reachable while it is folded.
        expect(
            screen.queryByRole('button', { name: 'Merge pull request' }),
        ).not.toBeInTheDocument();
    });

    test('opens into three cards to pick the method from, a native radio group', async () => {
        renderBox();
        await open();

        const group = screen.getByRole('radiogroup', { name: 'Merge method' });
        expect(group).toBeVisible();
        expect(screen.getAllByRole('radio')).toHaveLength(3);
        expect(
            screen.getByRole('radio', { name: /Merge commit/ }),
        ).toBeChecked();
        expect(
            screen.getByText('Turns all commits into one on the base branch.'),
        ).toBeInTheDocument();
    });

    test("merges with GitHub's default commit titles", async () => {
        const { props } = renderBox({
            onMerge: vi.fn().mockResolvedValue(false),
        });
        await open();

        await userEvent.click(
            screen.getByRole('button', { name: 'Merge pull request' }),
        );
        expect(props.onMerge).toHaveBeenLastCalledWith({
            method: 'merge',
            commitTitle: 'Merge pull request #7',
        });

        await userEvent.click(screen.getByRole('radio', { name: /Squash/ }));
        expect(screen.getByLabelText('Commit title')).toHaveValue(
            'Add login redirect (#7)',
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Squash and merge' }),
        );
        expect(props.onMerge).toHaveBeenLastCalledWith({
            method: 'squash',
            commitTitle: 'Add login redirect (#7)',
        });
    });

    test("takes an edited title, and changing the method goes back to that method's default", async () => {
        const { props } = renderBox({
            onMerge: vi.fn().mockResolvedValue(false),
        });
        await open();
        const field = screen.getByLabelText('Commit title');

        await userEvent.clear(field);
        await userEvent.type(field, 'Ship login');
        await userEvent.click(
            screen.getByRole('button', { name: 'Merge pull request' }),
        );
        expect(props.onMerge).toHaveBeenLastCalledWith({
            method: 'merge',
            commitTitle: 'Ship login',
        });

        await userEvent.click(screen.getByRole('radio', { name: /Squash/ }));
        expect(field).toHaveValue('Add login redirect (#7)');
    });

    test('a rebase keeps the commits as they are, so it takes no title', async () => {
        const { props } = renderBox();
        await open();

        await userEvent.click(screen.getByRole('radio', { name: /Rebase/ }));
        expect(screen.queryByLabelText('Commit title')).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Rebase and merge' }),
        );

        expect(props.onMerge).toHaveBeenCalledWith({ method: 'rebase' });
    });

    test('folds back up after a merge, and stays open when it failed', async () => {
        const { props, unmount } = renderBox();
        await open();
        await userEvent.click(
            screen.getByRole('button', { name: 'Merge pull request' }),
        );
        expect(props.onMerge).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /^Merge…/ })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        unmount();

        renderBox({ onMerge: vi.fn().mockResolvedValue(false) });
        await open();
        await userEvent.click(
            screen.getByRole('button', { name: 'Merge pull request' }),
        );
        expect(screen.getByRole('button', { name: /^Hide/ })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    test('remembers the method and says so on the closed line', async () => {
        const { unmount } = renderBox();
        await open();
        await userEvent.click(screen.getByRole('radio', { name: /Squash/ }));
        unmount();

        renderBox();

        expect(screen.getByText('Merges with: Squash')).toBeInTheDocument();
    });

    test('will not merge with an empty title, or while busy', async () => {
        const { props, rerender } = renderBox();
        await open();

        await userEvent.clear(screen.getByLabelText('Commit title'));
        expect(
            screen.getByRole('button', { name: 'Merge pull request' }),
        ).toBeDisabled();
        expect(props.onMerge).not.toHaveBeenCalled();

        rerender(<PullRequestMergeBox {...props} busy />);
        expect(screen.getByRole('button', { name: 'Merging…' })).toBeDisabled();
    });

    test('Cancel and Escape fold it back up', async () => {
        renderBox();
        await open();

        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByRole('button', { name: /^Merge…/ })).toHaveAttribute(
            'aria-expanded',
            'false',
        );

        await open();
        screen.getByLabelText('Commit title').focus();
        await userEvent.keyboard('{Escape}');
        expect(screen.getByRole('button', { name: /^Merge…/ })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    test('conflicts say why it cannot be merged and keep the box closed', async () => {
        renderBox({ blockedReason: 'Has conflicts to resolve first.' });

        expect(
            screen.getByText('Has conflicts to resolve first.'),
        ).toBeInTheDocument();
        const button = screen.getByRole('button', { name: /^Merge…/ });
        expect(button).toBeDisabled();
        await userEvent.click(button);
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });
});
