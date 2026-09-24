import { LinkedPullRequest } from '@/types/Issues';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import IssueDevelopmentPanel from './IssueDevelopmentPanel';

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
});
