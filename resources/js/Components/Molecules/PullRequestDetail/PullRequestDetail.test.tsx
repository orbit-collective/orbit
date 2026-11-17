import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    buildCommit,
    buildOverview,
    buildPullRequest,
    buildPullRequestDetail,
} from '@/tests/development';
import PullRequestDetail from './PullRequestDetail';

vi.mock('axios');
vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: Record<string, number>) =>
            `/${name}/${Object.values(params).join('/')}`,
    ),
);

const handlers = () => ({
    onSetState: vi.fn(),
    onMerge: vi.fn().mockResolvedValue(true),
    onLinkIssue: vi.fn(),
    onUnlinkIssue: vi.fn(),
});

const renderDetail = (
    overrides: Partial<Parameters<typeof PullRequestDetail>[0]> = {},
    callbacks = handlers(),
) => {
    const props = {
        projectId: 3,
        repositoryId: 9,
        pullRequest: buildPullRequest(),
        abilities: buildOverview().abilities,
        githubLinked: true,
        version: 0,
        busy: false,
        ...callbacks,
        ...overrides,
    };
    const view = render(<PullRequestDetail {...props} />);

    return {
        ...view,
        props,
        callbacks,
        rerenderWith: (next: Partial<typeof props>) =>
            view.rerender(<PullRequestDetail {...props} {...next} />),
    };
};

beforeEach(() => {
    vi.mocked(axios.get)
        .mockReset()
        .mockResolvedValue({ data: buildPullRequestDetail() });
    vi.mocked(axios.isCancel).mockReturnValue(false);
});

describe('PullRequestDetail', () => {
    test('reads the pull request of the repository and shows its size, checks, reviews and commits', async () => {
        renderDetail();

        expect(
            screen.getByRole('status', { name: 'Loading pull request' }),
        ).toBeInTheDocument();
        expect(await screen.findByText('+120')).toBeInTheDocument();
        expect(screen.getByText('−14')).toBeInTheDocument();
        expect(screen.getByText('6 files changed')).toBeInTheDocument();
        expect(screen.getByText('2 commits')).toBeInTheDocument();
        expect(screen.getByText('3 comments')).toBeInTheDocument();
        expect(screen.getByText('build')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(
            screen.getByText('fix: keep the redirect target'),
        ).toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledWith(
            '/projects.development.pull-requests.show/3/7',
            expect.objectContaining({ params: { repository_id: 9 } }),
        );
    });

    test('offers a way to retry when it cannot load', async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error('x'));
        renderDetail();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Could not load this pull request.',
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Try again' }),
        );

        expect(await screen.findByText('+120')).toBeInTheDocument();
    });

    test('says when nobody reviewed and trims a long commit list', async () => {
        const commits = Array.from({ length: 8 }, (_, index) =>
            buildCommit({
                sha: `sha${index}000000`,
                message: `commit ${index}`,
            }),
        );
        vi.mocked(axios.get).mockResolvedValue({
            data: buildPullRequestDetail({ reviews: [], commits }),
        });
        renderDetail();

        expect(
            await screen.findByText('Nobody has reviewed this yet.'),
        ).toBeInTheDocument();
        expect(screen.getAllByText(/^commit \d$/)).toHaveLength(5);
        expect(
            screen.getByRole('link', { name: '3 more on GitHub' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/pull/7/commits',
        );
    });

    test('reads again when the version changes', async () => {
        const { rerenderWith } = renderDetail();
        await screen.findByText('+120');

        rerenderWith({ version: 1 });

        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    });

    test('lists linked issues and lets a manager unlink or add one', async () => {
        const callbacks = handlers();
        renderDetail(
            {
                pullRequest: buildPullRequest({
                    issues: [{ id: 12, number: 4, title: 'Fix login' }],
                }),
            },
            callbacks,
        );
        await screen.findByText('+120');

        expect(
            screen.getByRole('link', { name: '#4 Fix login' }),
        ).toHaveAttribute('href', '/issues.show/3/12');

        await userEvent.click(
            screen.getByRole('button', { name: 'Unlink issue #4' }),
        );
        expect(callbacks.onUnlinkIssue).toHaveBeenCalledWith(12);

        await userEvent.click(
            screen.getByRole('button', { name: 'Link an issue' }),
        );
        expect(callbacks.onLinkIssue).toHaveBeenCalled();
    });

    test('says when no issue is linked', async () => {
        renderDetail();
        await screen.findByText('+120');

        expect(
            screen.getByText('No Orbit issue is linked to this pull request.'),
        ).toBeInTheDocument();
    });

    test('closing takes a second click to confirm, and Escape cancels it', async () => {
        const callbacks = handlers();
        renderDetail({}, callbacks);
        await screen.findByText('+120');

        const close = screen.getByRole('button', {
            name: 'Close pull request',
        });
        await userEvent.click(close);
        expect(callbacks.onSetState).not.toHaveBeenCalled();

        const confirm = screen.getByRole('button', {
            name: 'Click again to close',
        });
        confirm.focus();
        await userEvent.keyboard('{Escape}');
        expect(
            screen.getByRole('button', { name: 'Close pull request' }),
        ).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Close pull request' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Click again to close' }),
        );
        expect(callbacks.onSetState).toHaveBeenCalledWith('closed');
    });

    test('a closed pull request is reopened with one click, a merged one cannot be changed', async () => {
        const callbacks = handlers();
        const { unmount } = renderDetail(
            { pullRequest: buildPullRequest({ state: 'closed' }) },
            callbacks,
        );
        await screen.findByText('+120');

        await userEvent.click(
            screen.getByRole('button', { name: 'Reopen pull request' }),
        );
        expect(callbacks.onSetState).toHaveBeenCalledWith('open');
        unmount();

        renderDetail({ pullRequest: buildPullRequest({ state: 'merged' }) });
        await screen.findByText('+120');
        expect(
            screen.queryByRole('button', { name: /pull request$/ }),
        ).not.toBeInTheDocument();
    });

    test('without the manage ability there is nothing to change', async () => {
        renderDetail({ abilities: { manage: false, createBranch: false } });
        await screen.findByText('+120');

        expect(
            screen.queryByRole('button', { name: 'Close pull request' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Link an issue' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/Link your GitHub account/),
        ).not.toBeInTheDocument();
    });

    test('a manager without a linked GitHub account is told why they cannot change anything', async () => {
        renderDetail({ githubLinked: false });
        await screen.findByText('+120');

        expect(
            screen.getByText(
                'Link your GitHub account in Settings to change pull requests.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Close pull request' }),
        ).not.toBeInTheDocument();
    });

    test('always offers the pull request on GitHub, and disables writes while busy', async () => {
        renderDetail({
            busy: true,
            pullRequest: buildPullRequest({
                issues: [{ id: 1, number: 1, title: 'x' }],
            }),
        });
        await screen.findByText('+120');

        expect(
            screen.getByRole('link', { name: 'Open on GitHub' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/pull/7',
        );
        const actions = screen.getByRole('button', {
            name: 'Close pull request',
        });
        expect(actions).toBeDisabled();
        expect(
            within(
                screen.getByRole('region', {
                    hidden: true,
                    name: /Linked issues/,
                }),
            ).getByRole('button', { name: 'Link an issue' }),
        ).toBeDisabled();
    });

    test('a manager can merge an open pull request: the form opens, with the method and commit title', async () => {
        const callbacks = handlers();
        renderDetail({}, callbacks);
        await screen.findByText('+120');

        const merge = screen.getByRole('button', { name: /^Merge…/ });
        expect(merge).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(merge);
        await screen.findByRole('radiogroup');

        expect(
            screen.getByRole('form', { name: 'Merge pull request #7' }),
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Merge pull request' }),
        );

        expect(callbacks.onMerge).toHaveBeenCalledWith({
            method: 'merge',
            commitTitle: 'Merge pull request #7',
        });
        // Folded back up once it is merged.
        await waitFor(() =>
            expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument(),
        );
    });

    test('the form stays open when the merge did not work', async () => {
        const callbacks = {
            ...handlers(),
            onMerge: vi.fn().mockResolvedValue(false),
        };
        renderDetail({}, callbacks);
        await screen.findByText('+120');

        await userEvent.click(screen.getByRole('button', { name: /^Merge…/ }));
        await screen.findByRole('radiogroup');
        await userEvent.click(
            screen.getByRole('button', { name: 'Merge pull request' }),
        );

        expect(callbacks.onMerge).toHaveBeenCalled();
        expect(screen.getByRole('form')).toBeInTheDocument();
    });

    test('shows where the pull request stands against its base', async () => {
        renderDetail();

        expect(await screen.findByText('Ready to merge')).toBeInTheDocument();
    });

    test('conflicts block merging, and say why', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: buildPullRequestDetail({ mergeableState: 'dirty' }),
        });
        renderDetail();
        await screen.findByText('Has conflicts');

        const merge = screen.getByRole('button', { name: /^Merge…/ });
        expect(merge).toBeDisabled();
        expect(
            screen.getByText(/conflicts that must be resolved/),
        ).toBeInTheDocument();
    });

    test('other states leave merging to GitHub, which says why it refuses', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: buildPullRequestDetail({ mergeableState: 'blocked' }),
        });
        renderDetail();

        expect(
            await screen.findByText('Blocked by branch rules'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Merge…/ })).toBeEnabled();
    });

    test('no merge for a draft, a closed pull request, or without the manage ability', async () => {
        const { unmount } = renderDetail({
            pullRequest: buildPullRequest({ draft: true }),
        });
        await screen.findByText('+120');
        expect(
            screen.queryByRole('button', { name: /^Merge…/ }),
        ).not.toBeInTheDocument();
        unmount();

        const { unmount: unmountClosed } = renderDetail({
            pullRequest: buildPullRequest({ state: 'closed' }),
        });
        await screen.findByText('+120');
        expect(
            screen.queryByRole('button', { name: /^Merge…/ }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Ready to merge')).not.toBeInTheDocument();
        unmountClosed();

        renderDetail({ abilities: { manage: false, createBranch: false } });
        await screen.findByText('+120');
        expect(
            screen.queryByRole('button', { name: /^Merge…/ }),
        ).not.toBeInTheDocument();
    });

    test('hands the checks it just read fresh to the list, which may have been showing them as still running', async () => {
        const onChecks = vi.fn();
        renderDetail({ onChecks });

        await screen.findByText('+120');

        expect(onChecks).toHaveBeenCalledWith(
            'abc1234def',
            expect.objectContaining({ state: 'passed' }),
        );
    });
});
