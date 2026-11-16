import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    buildBranch,
    buildCi,
    buildCommit,
    buildInsights,
    buildOverview,
    buildPullRequest,
    buildPullRequestDetail,
} from '@/tests/development';
import { Project } from '@/types/Projects';
import {
    DEFAULT_SETTINGS,
    SETTINGS_STORAGE_KEY,
    sinceFor,
} from '@/utils/developmentSettings';
import DevelopmentView from './DevelopmentView';

vi.mock('axios');

const addAlert = vi.fn();
vi.mock('@/context/AlertContext', () => ({ useAlert: () => ({ addAlert }) }));

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: Record<string, string | number>) =>
            `/${name}/${Object.values(params).join('/')}`,
    ),
);

const project = { id: 3, name: 'Orbit' } as Project;

const answers =
    (overrides: Record<string, unknown> = {}) =>
    (url: string, config?: { params?: { refs?: string[] } }) => {
        const table: Record<string, unknown> = {
            'pull-requests.index': {
                pullRequests: [
                    buildPullRequest({ title: 'Add login redirect', ci: null }),
                ],
                hasMore: false,
            },
            'checks.batch': {
                checks: Object.fromEntries(
                    (config?.params?.refs ?? []).map((sha) => [sha, buildCi()]),
                ),
            },
            'pull-requests.show': buildPullRequestDetail(),
            'insights.show': buildInsights(),
            'branches.index': {
                branches: [
                    buildBranch(),
                    buildBranch({
                        name: 'develop',
                        isDefault: false,
                        protected: false,
                    }),
                ],
                total: 2,
            },
            'commits.index': { commits: [buildCommit()] },
            ...overrides,
        };
        const key = Object.keys(table).find((name) =>
            url.includes(`development.${name}`),
        );

        return key
            ? Promise.resolve({ data: table[key] })
            : Promise.reject(new Error(`unexpected ${url}`));
    };

beforeEach(() => {
    addAlert.mockReset();
    vi.mocked(axios.get)
        .mockReset()
        .mockImplementation(answers() as never);
    vi.mocked(axios.post).mockReset().mockResolvedValue({ data: {} });
    vi.mocked(axios.isCancel).mockReturnValue(false);
});

const renderViewWithTwo = () =>
    render(
        <DevelopmentView
            project={project}
            development={buildOverview({
                repositories: [
                    { id: 1, owner: 'orbit-collective', name: 'orbit' },
                    { id: 2, owner: 'orbit-collective', name: 'orbit-api' },
                ],
            })}
        />,
    );

const renderView = (overview = buildOverview()) =>
    render(<DevelopmentView project={project} development={overview} />);

describe('DevelopmentView', () => {
    test('asks to connect GitHub when it is not connected', () => {
        renderView(buildOverview({ connected: false, repositories: [] }));

        expect(
            screen.getByRole('heading', {
                name: 'Connect GitHub to see development here',
            }),
        ).toBeInTheDocument();
        expect(axios.get).not.toHaveBeenCalled();
    });

    test('asks to add a repository when there is none', () => {
        renderView(buildOverview({ repositories: [] }));

        expect(
            screen.getByRole('heading', { name: 'Add a repository' }),
        ).toBeInTheDocument();
    });

    test('reads the repository and shows its pull requests, statistics, branches and commits', async () => {
        renderView();

        expect(
            await screen.findByText('Add login redirect'),
        ).toBeInTheDocument();
        expect(await screen.findByText('Commit activity')).toBeInTheDocument();
        expect(await screen.findByText('develop')).toBeInTheDocument();
        expect(
            await screen.findByText('fix: keep the redirect target'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'orbit-collective/orbit' }),
        ).toBeInTheDocument();
        expect(await screen.findByText('Public')).toBeInTheDocument();
        expect(screen.getAllByText('42').length).toBeGreaterThan(0);

        expect(axios.get).toHaveBeenCalledWith(
            '/projects.development.pull-requests.index/3',
            expect.objectContaining({
                params: {
                    repository_id: 1,
                    state: 'all',
                    since: sinceFor(DEFAULT_SETTINGS.range),
                    page: 1,
                    per_page: 100,
                },
            }),
        );
        expect(axios.get).toHaveBeenCalledWith(
            '/projects.development.branches.index/3',
            expect.objectContaining({
                params: { repository_id: 1, page: 1, per_page: 5 },
            }),
        );
        // The commits are of the default branch without waiting to be told which it is.
        expect(axios.get).toHaveBeenCalledWith(
            '/projects.development.commits.index/3',
            expect.objectContaining({
                params: { repository_id: 1, per_page: 8 },
            }),
        );
    });

    test('reads the checks apart from the list, in one call for the open pull requests on screen', async () => {
        renderView();

        expect(await screen.findByText('Checks passed')).toBeInTheDocument();

        const checkCalls = vi
            .mocked(axios.get)
            .mock.calls.filter(([url]) => String(url).includes('checks.batch'));
        expect(checkCalls).toHaveLength(1);
        expect(checkCalls[0][1]).toEqual(
            expect.objectContaining({
                params: { repository_id: 1, refs: ['abc1234def'] },
            }),
        );
        const listCall = vi
            .mocked(axios.get)
            .mock.calls.find(([url]) =>
                String(url).includes('pull-requests.index'),
            );
        expect(JSON.stringify(listCall)).not.toContain('ci');
    });

    test('hiding a section stops it being read from GitHub, not just drawn', async () => {
        localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify({
                sections: {
                    stats: false,
                    insights: false,
                    branches: false,
                    commits: false,
                },
            }),
        );
        renderView();

        expect(
            await screen.findByText('Add login redirect'),
        ).toBeInTheDocument();

        const urls = vi
            .mocked(axios.get)
            .mock.calls.map(([url]) => String(url));
        expect(urls.some((url) => url.includes('insights.show'))).toBe(false);
        expect(urls.some((url) => url.includes('branches.index'))).toBe(false);
        expect(urls.some((url) => url.includes('commits.index'))).toBe(false);
        expect(screen.queryByText('Commit activity')).not.toBeInTheDocument();
        expect(
            screen.queryByText('Open pull requests'),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Latest commits')).not.toBeInTheDocument();
    });

    test('customizing: a shorter time range reads the pull requests again from that date', async () => {
        renderView();
        await screen.findByText('Add login redirect');

        await userEvent.click(
            screen.getByRole('button', { name: 'Customize the view' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Customize the development view',
        });
        await userEvent.click(
            within(dialog).getByRole('button', { name: '30 days' }),
        );

        await waitFor(() =>
            expect(axios.get).toHaveBeenCalledWith(
                '/projects.development.pull-requests.index/3',
                expect.objectContaining({
                    params: expect.objectContaining({ since: sinceFor('30d') }),
                }),
            ),
        );
        expect(
            JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!).range,
        ).toBe('30d');
        expect(
            screen.getAllByText('Updated in the last 30 days').length,
        ).toBeGreaterThan(1);

        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Reset to defaults' }),
        );
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Done' }),
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('shows a private repository as private', async () => {
        vi.mocked(axios.get).mockImplementation(
            answers({
                'insights.show': buildInsights({
                    repository: {
                        ...buildInsights().repository,
                        private: true,
                    },
                }),
            }) as never,
        );
        renderView();

        expect(await screen.findByText('Private')).toBeInTheDocument();
    });

    test('lets you pick between several repositories and remembers it', async () => {
        const overview = buildOverview({
            repositories: [
                { id: 1, owner: 'orbit-collective', name: 'orbit' },
                { id: 2, owner: 'orbit-collective', name: 'orbit-api' },
            ],
        });
        renderView(overview);
        await screen.findByText('Add login redirect');

        await userEvent.click(
            screen.getByRole('button', { name: /Repository/ }),
        );
        await userEvent.click(
            await screen.findByText('orbit-collective/orbit-api'),
        );

        await waitFor(() =>
            expect(axios.get).toHaveBeenCalledWith(
                '/projects.development.pull-requests.index/3',
                expect.objectContaining({
                    params: expect.objectContaining({ repository_id: 2 }),
                }),
            ),
        );
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'developmentRepository.3',
            '2',
        );
    });

    test('shows an error where a read failed, with the rest still there', async () => {
        vi.mocked(axios.get).mockImplementation(((url: string) =>
            url.includes('commits.index')
                ? Promise.reject({
                      response: {
                          data: { errors: { development: ['GitHub is down'] } },
                      },
                  })
                : answers()(url)) as never);
        renderView();

        expect(await screen.findByText('GitHub is down')).toBeInTheDocument();
        expect(
            await screen.findByText('Add login redirect'),
        ).toBeInTheDocument();
    });

    test('refresh drops the server cache and reads everything again', async () => {
        renderView();
        await screen.findByText('Add login redirect');
        const reads = vi.mocked(axios.get).mock.calls.length;

        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        expect(axios.post).toHaveBeenCalledWith(
            '/projects.development.refresh/3',
        );
        await waitFor(() =>
            expect(vi.mocked(axios.get).mock.calls.length).toBeGreaterThan(
                reads,
            ),
        );
    });

    test('refresh still reads again when dropping the cache failed', async () => {
        vi.mocked(axios.post).mockRejectedValue(new Error('x'));
        renderView();
        await screen.findByText('Add login redirect');
        const reads = vi.mocked(axios.get).mock.calls.length;

        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() =>
            expect(vi.mocked(axios.get).mock.calls.length).toBeGreaterThan(
                reads,
            ),
        );
    });

    test('creates a branch from the header and reads again', async () => {
        renderView();
        await screen.findByText('develop');

        await userEvent.click(
            screen.getByRole('button', { name: 'New branch' }),
        );
        const dialog = screen.getByRole('dialog', { name: 'Create a branch' });
        await userEvent.type(
            within(dialog).getByLabelText('Branch name'),
            'feat/new',
        );
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Create branch' }),
        );

        await waitFor(() =>
            expect(axios.post).toHaveBeenCalledWith(
                '/projects.development.branches.store/3',
                {
                    repository_id: 1,
                    name: 'feat/new',
                    base_branch: 'master',
                },
            ),
        );
        expect(addAlert).toHaveBeenCalledWith(
            'Created branch feat/new.',
            'success',
        );
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );
    });

    test('offers no branch creation without the ability or a linked GitHub account', async () => {
        const { unmount } = renderView(
            buildOverview({ abilities: { manage: true, createBranch: false } }),
        );
        await screen.findByText('develop');
        expect(
            screen.queryByRole('button', { name: 'New branch' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Create a branch' }),
        ).not.toBeInTheDocument();
        unmount();

        renderView(buildOverview({ githubLinked: false }));
        await screen.findByText('develop');
        expect(
            screen.queryByRole('button', { name: 'New branch' }),
        ).not.toBeInTheDocument();
    });

    test('closing a pull request from its detail goes through the write and refreshes the view', async () => {
        renderView();
        await userEvent.click(
            await screen.findByRole('button', { name: /Add login redirect/ }),
        );
        await screen.findByText('+120');

        await userEvent.click(
            screen.getByRole('button', { name: 'Close pull request' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Click again to close' }),
        );

        await waitFor(() =>
            expect(axios.post).toHaveBeenCalledWith(
                '/projects.development.pull-requests.state/3/7',
                {
                    repository_id: 1,
                    state: 'closed',
                },
            ),
        );
        expect(addAlert).toHaveBeenCalledWith(
            'Closed pull request #7.',
            'success',
        );
    });

    test('links to the repository on GitHub', async () => {
        renderView();
        await screen.findByText('Add login redirect');

        expect(
            screen.getByRole('link', { name: 'Open on GitHub' }),
        ).toHaveAttribute('href', 'https://github.com/orbit-collective/orbit');
    });

    test('switching repository shows skeletons instead of the previous repository data', async () => {
        const pending = new Promise(() => {});
        renderViewWithTwo();
        await screen.findByText('Add login redirect');

        vi.mocked(axios.get).mockImplementation(((url: string) =>
            url.includes('pull-requests.index') || url.includes('insights.show')
                ? pending
                : answers()(url)) as never);

        await userEvent.click(
            screen.getByRole('button', { name: /Repository/ }),
        );
        await userEvent.click(
            await screen.findByText('orbit-collective/orbit-api'),
        );

        await waitFor(() =>
            expect(
                screen.queryByText('Add login redirect'),
            ).not.toBeInTheDocument(),
        );
        expect(
            screen.getByRole('status', { name: 'Loading pull requests' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('status', {
                name: 'Loading repository statistics',
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(5);
    });
});
