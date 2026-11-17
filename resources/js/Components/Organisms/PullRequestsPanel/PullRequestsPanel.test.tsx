import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    buildOverview,
    buildPullRequest,
    buildPullRequestDetail,
} from '@/tests/development';
import PullRequestsPanel from './PullRequestsPanel';

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: vi.fn() }),
}));

const PULL_REQUESTS_PER_PAGE = 8;

vi.mock('axios');
vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: Record<string, number>) =>
            `/${name}/${Object.values(params).join('/')}`,
    ),
);

const pullRequests = [
    buildPullRequest({ number: 1, title: 'Open one' }),
    buildPullRequest({ number: 2, title: 'Open two', id: 2 }),
    buildPullRequest({
        number: 3,
        title: 'Merged one',
        id: 3,
        state: 'merged',
        ci: null,
    }),
    buildPullRequest({
        number: 4,
        title: 'Closed one',
        id: 4,
        state: 'closed',
        ci: null,
    }),
];

const renderPanel = (
    overrides: Partial<Parameters<typeof PullRequestsPanel>[0]> = {},
) => {
    const props = {
        projectId: 3,
        repositoryId: 9,
        repositoryUrl: 'https://github.com/orbit-collective/orbit',
        pullRequests,
        loading: false,
        perPage: 8,
        perPageOptions: [8, 16, 32],
        onPerPageChange: vi.fn(),

        error: null,
        onRetry: vi.fn(),
        abilities: buildOverview().abilities,
        githubLinked: true,
        version: 0,
        busy: false,
        onSetState: vi.fn(),
        onMerge: vi.fn().mockResolvedValue(true),
        onLinkIssue: vi.fn().mockResolvedValue(true),
        onUnlinkIssue: vi.fn(),
        ...overrides,
    };

    return { props, ...render(<PullRequestsPanel {...props} />) };
};

beforeEach(() => {
    vi.mocked(axios.get)
        .mockReset()
        .mockResolvedValue({ data: buildPullRequestDetail() });
});

describe('PullRequestsPanel', () => {
    test('shows the open pull requests first, with a count on every segment', () => {
        renderPanel();

        expect(screen.getByText('Open one')).toBeInTheDocument();
        expect(screen.getByText('Open two')).toBeInTheDocument();
        expect(screen.queryByText('Merged one')).not.toBeInTheDocument();

        const filter = screen.getByRole('group', {
            name: 'Filter pull requests',
        });
        expect(
            within(filter).getByRole('button', { name: 'Open 2' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            within(filter).getByRole('button', { name: 'Merged 1' }),
        ).toBeInTheDocument();
        expect(
            within(filter).getByRole('button', { name: 'Closed 1' }),
        ).toBeInTheDocument();
        expect(
            within(filter).getByRole('button', { name: 'All 4' }),
        ).toBeInTheDocument();
    });

    test('switches the filter without reading anything again', async () => {
        renderPanel();

        await userEvent.click(screen.getByRole('button', { name: 'Merged 1' }));
        expect(screen.getByText('Merged one')).toBeInTheDocument();
        expect(screen.queryByText('Open one')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'All 4' }));
        expect(screen.getAllByRole('article')).toHaveLength(4);
        expect(axios.get).not.toHaveBeenCalled();
    });

    test('remembers the chosen filter', async () => {
        const { unmount } = renderPanel();
        await userEvent.click(screen.getByRole('button', { name: 'Closed 1' }));
        unmount();

        renderPanel();

        expect(screen.getByText('Closed one')).toBeInTheDocument();
    });

    test('says what is empty for the chosen filter', async () => {
        renderPanel({ pullRequests: [] });
        expect(screen.getByText('No open pull requests.')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /^Merged/ }));
        expect(screen.getByText('Nothing merged yet.')).toBeInTheDocument();
    });

    test('shows skeletons while the first answer is on its way', () => {
        renderPanel({ pullRequests: null, loading: true });

        expect(
            screen.getByRole('status', { name: 'Loading pull requests' }),
        ).toBeInTheDocument();
    });

    test('shows the error with a retry when there is nothing to show', async () => {
        const { props } = renderPanel({
            pullRequests: null,
            error: 'GitHub is down',
        });

        expect(screen.getByRole('alert')).toHaveTextContent('GitHub is down');
        await userEvent.click(
            screen.getByRole('button', { name: 'Try again' }),
        );
        expect(props.onRetry).toHaveBeenCalled();
    });

    test('keeps the list when a reload failed', () => {
        renderPanel({ error: 'GitHub is down' });

        expect(screen.getByText('Open one')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('opens one row at a time and loads its detail only then', async () => {
        renderPanel();

        await userEvent.click(screen.getByRole('button', { name: /Open one/ }));
        expect(await screen.findByText('+120')).toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledTimes(1);

        await userEvent.click(screen.getByRole('button', { name: /Open two/ }));
        expect(
            screen.getByRole('button', { name: /Open one/ }),
        ).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.getByRole('button', { name: /Open two/ }),
        ).toHaveAttribute('aria-expanded', 'true');

        await userEvent.click(screen.getByRole('button', { name: /Open two/ }));
        expect(
            screen.getByRole('button', { name: /Open two/ }),
        ).toHaveAttribute('aria-expanded', 'false');
    });

    test('closing a pull request and unlinking an issue are forwarded with its number', async () => {
        const { props } = renderPanel({
            pullRequests: [
                buildPullRequest({
                    number: 5,
                    issues: [{ id: 12, number: 4, title: 'Fix login' }],
                }),
            ],
        });

        await userEvent.click(
            screen.getByRole('button', { name: /Add login redirect/ }),
        );
        await screen.findByText('+120');
        await userEvent.click(
            screen.getByRole('button', { name: 'Unlink issue #4' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Close pull request' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Click again to close' }),
        );

        expect(props.onUnlinkIssue).toHaveBeenCalledWith(5, 12);
        expect(props.onSetState).toHaveBeenCalledWith(5, 'closed');
    });

    test('links an issue from the picker', async () => {
        vi.mocked(axios.get).mockImplementation((url: string) =>
            Promise.resolve({
                data: String(url).includes('issues.search')
                    ? { issues: [{ id: 21, number: 9, title: 'Ship it' }] }
                    : buildPullRequestDetail(),
            }),
        );
        const { props } = renderPanel();

        await userEvent.click(screen.getByRole('button', { name: /Open one/ }));
        await screen.findByText('+120');
        await userEvent.click(
            screen.getByRole('button', { name: 'Link an issue' }),
        );
        await userEvent.type(screen.getByRole('combobox'), 'ship');
        await userEvent.click(
            await screen.findByRole('option', { name: /Ship it/ }),
        );

        expect(props.onLinkIssue).toHaveBeenCalledWith(1, 21);
        await vi.waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );
    });

    test('points to GitHub when the range holds more than the limit, and says how many are shown', () => {
        renderPanel({ capped: true, limit: 250 });

        expect(
            screen.getByText('Showing the newest 250 of this range.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /See all on GitHub/ }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/pulls',
        );
    });

    test('shows no such pointer while everything in the range is read', () => {
        renderPanel();

        expect(
            screen.queryByRole('link', { name: /See all on GitHub/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/Showing the newest/),
        ).not.toBeInTheDocument();
    });

    test('says older pull requests are still being read behind the ones shown', () => {
        renderPanel({ loadingMore: true });

        expect(screen.getByRole('status')).toHaveTextContent(
            'Reading older pull requests…',
        );
        expect(screen.getByText('Open one')).toBeInTheDocument();
    });

    test('names the time range under the title', () => {
        renderPanel({ rangeLabel: 'Updated in the last 90 days' });

        expect(
            screen.getByText('Updated in the last 90 days'),
        ).toBeInTheDocument();
    });

    test('shows a placeholder where the checks of an open pull request are still arriving', () => {
        renderPanel({
            pullRequests: [
                buildPullRequest({ number: 1, ci: null, headSha: 'abc' }),
            ],
            ciPending: new Set(['abc']),
        });

        expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
        expect(screen.queryByText(/Checks/)).not.toBeInTheDocument();
    });

    test('tells the view which open pull requests are on screen, so only their checks are read', async () => {
        const onVisibleShas = vi.fn();
        renderPanel({ onVisibleShas });

        expect(onVisibleShas).toHaveBeenLastCalledWith([
            'abc1234def',
            'abc1234def',
        ]);

        await userEvent.click(screen.getByRole('button', { name: /^Merged/ }));
        expect(onVisibleShas).toHaveBeenLastCalledWith([]);
    });

    test('reports a new page size and starts again from the first page', async () => {
        const onPerPageChange = vi.fn();
        const many = Array.from({ length: 20 }, (_, index) =>
            buildPullRequest({ number: index + 1, id: index + 1 }),
        );
        renderPanel({ pullRequests: many, onPerPageChange });

        await userEvent.click(
            screen.getByRole('button', { name: 'Next page' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: /Rows per page/ }),
        );
        await userEvent.click(
            await screen.findByRole('menuitemradio', { name: /16/ }),
        );

        expect(onPerPageChange).toHaveBeenCalledWith(16);
    });

    test('pages through a long list instead of listing everything', async () => {
        const many = Array.from(
            { length: PULL_REQUESTS_PER_PAGE + 3 },
            (_, index) =>
                buildPullRequest({
                    number: index + 1,
                    id: index + 1,
                    title: `Pull request ${index + 1}`,
                }),
        );
        renderPanel({ pullRequests: many });

        expect(screen.getAllByRole('article')).toHaveLength(
            PULL_REQUESTS_PER_PAGE,
        );
        expect(screen.getByText(/Showing/)).toHaveTextContent(
            `Showing 1 to ${PULL_REQUESTS_PER_PAGE} of ${PULL_REQUESTS_PER_PAGE + 3} results`,
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Next page' }),
        );
        expect(screen.getAllByRole('article')).toHaveLength(3);
        expect(screen.getByText('Pull request 9')).toBeInTheDocument();

        // A filter change starts again from the first page.
        await userEvent.click(screen.getByRole('button', { name: /^Merged/ }));
        await userEvent.click(screen.getByRole('button', { name: /^Open/ }));
        expect(screen.getAllByRole('article')).toHaveLength(
            PULL_REQUESTS_PER_PAGE,
        );
    });

    test('shows no pager for a short list', () => {
        renderPanel();

        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    test('merging passes the pull request number, the options and the head the person saw', async () => {
        const { props } = renderPanel({
            pullRequests: [
                buildPullRequest({ number: 5, headSha: 'f00dbabe' }),
            ],
        });

        await userEvent.click(
            screen.getByRole('button', { name: /Add login redirect/ }),
        );
        await screen.findByText('+120');
        await userEvent.click(screen.getByRole('button', { name: /^Merge…/ }));
        await screen.findByRole('radiogroup');
        await userEvent.click(screen.getByRole('radio', { name: /Squash/ }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Squash and merge' }),
        );

        expect(props.onMerge).toHaveBeenCalledWith(
            5,
            { method: 'squash', commitTitle: 'Add login redirect (#5)' },
            'f00dbabe',
        );
    });
});
