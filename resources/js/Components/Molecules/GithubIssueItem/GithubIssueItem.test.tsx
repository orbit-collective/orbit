import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { buildGithubIssue } from '@/tests/development';
import GithubIssueItem from './GithubIssueItem';

const renderItem = (
    overrides: Partial<Parameters<typeof GithubIssueItem>[0]> = {},
) => {
    const onCreateBranch = vi.fn();
    render(
        <ul>
            <GithubIssueItem
                issue={buildGithubIssue()}
                branchName="12-fix-the-login-redirect"
                branchCreated={false}
                creating={false}
                busy={false}
                onCreateBranch={onCreateBranch}
                {...overrides}
            />
        </ul>,
    );

    return onCreateBranch;
};

describe('GithubIssueItem', () => {
    test('shows the title as a link to GitHub with its number, labels, author and activity', () => {
        renderItem();

        expect(
            screen.getByRole('link', { name: 'Fix the login redirect' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/issues/12',
        );
        expect(screen.getByText('#12')).toBeInTheDocument();
        expect(screen.getByText('bug')).toHaveStyle({ color: '#d73a4a' });
        expect(screen.getByText('ada')).toBeInTheDocument();
        expect(screen.getByText('updated 1d ago')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Open:')).toHaveClass('sr-only');
    });

    test('does not trust a label colour that is not a hex colour', () => {
        renderItem({
            issue: buildGithubIssue({
                labels: [{ name: 'odd', color: 'red; background:url(x)' }],
            }),
        });

        expect(screen.getByText('odd')).toHaveStyle({ color: '#757575' });
    });

    test('one click creates the branch named after the issue', async () => {
        const onCreateBranch = renderItem();

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Create branch 12-fix-the-login-redirect',
            }),
        );

        expect(onCreateBranch).toHaveBeenCalledTimes(1);
    });

    test('shows a created branch as done and cannot create it again', async () => {
        const onCreateBranch = renderItem({ branchCreated: true });

        const button = screen.getByRole('button', {
            name: 'Branch 12-fix-the-login-redirect created',
        });
        expect(button).toBeDisabled();
        await userEvent.click(button);
        expect(onCreateBranch).not.toHaveBeenCalled();
    });

    test('is disabled while it creates or another write runs', () => {
        const { unmount } = render(<ul />);
        unmount();

        renderItem({ creating: true });
        expect(screen.getByRole('button')).toBeDisabled();
    });

    test('has no button when branches cannot be created, and draws a closed issue as closed', () => {
        renderItem({
            branchName: null,
            issue: buildGithubIssue({ state: 'closed', commentCount: 0 }),
        });

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByText('Closed:')).toBeInTheDocument();
        expect(screen.queryByText('comments')).not.toBeInTheDocument();
    });
});
