import { GithubDevelopmentRepository, LinkedPullRequest } from '@/types/Issues';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import IssueDevelopmentPanel from './IssueDevelopmentPanel';

const repository: GithubDevelopmentRepository = {
    id: 1,
    owner: 'orbit-collective',
    name: 'orbit',
};

const buildPullRequest = (
    overrides: Partial<LinkedPullRequest> = {},
): LinkedPullRequest => ({
    provider: 'github',
    number: 283,
    title: 'Fix login redirect',
    repositoryOwner: 'orbit-collective',
    repositoryName: 'orbit',
    url: 'https://github.com/orbit-collective/orbit/pull/283',
    sourceBranch: 'fix/login-redirect',
    targetBranch: 'master',
    status: 'open',
    draft: false,
    checkStatus: null,
    reviewStatus: null,
    ...overrides,
});

describe('IssueDevelopmentPanel', () => {
    test('renders nothing when there are no linked pull requests', () => {
        const { container } = render(
            <IssueDevelopmentPanel pullRequests={[]} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('renders a full pull request with title, branches, status and link', () => {
        render(<IssueDevelopmentPanel pullRequests={[buildPullRequest()]} />);

        expect(screen.getByText('Fix login redirect')).toBeInTheDocument();
        expect(
            screen.getByText(/orbit-collective\/orbit #283/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/fix\/login-redirect.*master/),
        ).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();

        const link = screen.getByText('Fix login redirect').closest('a');
        expect(link).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/pull/283',
        );
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('falls back to the PR number when title is null', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[buildPullRequest({ title: null })]}
            />,
        );

        expect(screen.getByText('#283')).toBeInTheDocument();
    });

    test('omits the branch row when either branch is missing', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[
                    buildPullRequest({
                        sourceBranch: null,
                        targetBranch: null,
                    }),
                ]}
            />,
        );

        expect(screen.queryByText(/→/)).not.toBeInTheDocument();
    });

    test('shows a Draft badge when the pull request is a draft', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[buildPullRequest({ draft: true })]}
            />,
        );

        expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    test('shows a Merged badge when the pull request has been merged', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[
                    buildPullRequest({ status: 'merged', draft: false }),
                ]}
            />,
        );

        expect(screen.getByText('Merged')).toBeInTheDocument();
        expect(screen.queryByText('Open')).not.toBeInTheDocument();
    });

    test('shows a Closed badge when the pull request was closed without merging', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[
                    buildPullRequest({ status: 'closed', draft: false }),
                ]}
            />,
        );

        expect(screen.getByText('Closed')).toBeInTheDocument();
        expect(screen.queryByText('Open')).not.toBeInTheDocument();
    });

    test('omits the status badge for a legacy link with no status or draft state', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[buildPullRequest({ status: null, draft: null })]}
            />,
        );

        expect(screen.queryByText('Open')).not.toBeInTheDocument();
        expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    });

    test('renders multiple linked pull requests as a list', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[
                    buildPullRequest({
                        number: 283,
                        url: 'https://github.com/orbit-collective/orbit/pull/283',
                    }),
                    buildPullRequest({
                        number: 284,
                        title: 'Add retry button',
                        url: 'https://github.com/orbit-collective/orbit/pull/284',
                    }),
                ]}
            />,
        );

        expect(screen.getByText('Fix login redirect')).toBeInTheDocument();
        expect(screen.getByText('Add retry button')).toBeInTheDocument();
    });

    test('shows a CI passed and Approved badge when both are reported', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[
                    buildPullRequest({
                        checkStatus: 'passed',
                        reviewStatus: 'approved',
                    }),
                ]}
            />,
        );

        expect(screen.getByText('CI passed')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    test('shows CI failed and Changes requested badges', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[
                    buildPullRequest({
                        checkStatus: 'failed',
                        reviewStatus: 'changes_requested',
                    }),
                ]}
            />,
        );

        expect(screen.getByText('CI failed')).toBeInTheDocument();
        expect(screen.getByText('Changes requested')).toBeInTheDocument();
    });

    test('hides CI and review badges when neither has been reported', () => {
        render(<IssueDevelopmentPanel pullRequests={[buildPullRequest()]} />);

        expect(screen.queryByText(/CI /)).not.toBeInTheDocument();
        expect(screen.queryByText('Approved')).not.toBeInTheDocument();
        expect(screen.queryByText('Changes requested')).not.toBeInTheDocument();
    });

    test('shows an empty-state affordance with no linked pull requests but a connected repository', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[]}
                repositories={[repository]}
                onCreateBranch={() => {}}
                onCreatePullRequest={() => {}}
            />,
        );

        expect(
            screen.getByText('No linked pull requests yet.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create branch' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create pull request' }),
        ).toBeInTheDocument();
    });

    test('renders nothing when there are no pull requests and no connected repositories', () => {
        const { container } = render(
            <IssueDevelopmentPanel pullRequests={[]} repositories={[]} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('creates a branch with the prefilled default name', () => {
        const onCreateBranch = vi.fn();

        render(
            <IssueDevelopmentPanel
                pullRequests={[]}
                repositories={[repository]}
                defaultBranchName="1234-fix-login"
                onCreateBranch={onCreateBranch}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));

        const input = screen.getByPlaceholderText('branch-name');
        expect(input).toHaveValue('1234-fix-login');

        fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));

        expect(onCreateBranch).toHaveBeenCalledWith({
            repositoryId: 1,
            name: '1234-fix-login',
        });
    });

    test('cancelling the create-branch form returns to the action row', () => {
        render(
            <IssueDevelopmentPanel
                pullRequests={[]}
                repositories={[repository]}
                onCreateBranch={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(
            screen.getByRole('button', { name: 'Create branch' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText('branch-name'),
        ).not.toBeInTheDocument();
    });

    test('creates a pull request with title, head, and a default base branch', () => {
        const onCreatePullRequest = vi.fn();

        render(
            <IssueDevelopmentPanel
                pullRequests={[]}
                repositories={[repository]}
                defaultBranchName="1234-fix-login"
                onCreatePullRequest={onCreatePullRequest}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Create pull request' }),
        );

        fireEvent.change(screen.getByPlaceholderText('Pull request title'), {
            target: { value: 'Fix login redirect' },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Create pull request' }),
        );

        expect(onCreatePullRequest).toHaveBeenCalledWith({
            repositoryId: 1,
            title: 'Fix login redirect',
            head: '1234-fix-login',
            base: 'main',
        });
    });

    test('shows a repository picker only when more than one repository is connected', () => {
        const secondRepository: GithubDevelopmentRepository = {
            id: 2,
            owner: 'orbit-collective',
            name: 'orbit-api',
        };

        const { rerender } = render(
            <IssueDevelopmentPanel
                pullRequests={[]}
                repositories={[repository]}
                onCreateBranch={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        rerender(
            <IssueDevelopmentPanel
                pullRequests={[]}
                repositories={[repository, secondRepository]}
                onCreateBranch={() => {}}
            />,
        );

        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
});
