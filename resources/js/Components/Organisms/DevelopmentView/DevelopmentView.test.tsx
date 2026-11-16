import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    buildBranch,
    buildCommit,
    buildInsights,
    buildOverview,
    buildPullRequest,
    buildPullRequestDetail,
} from '@/tests/development';
import { Project } from '@/types/Projects';
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
    (url: string) => {
        const table: Record<string, unknown> = {
            'pull-requests.index': {
                pullRequests: [
                    buildPullRequest({ title: 'Add login redirect' }),
                ],
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
                params: { repository_id: 1, state: 'all', per_page: 50 },
            }),
        );
        // The commits are those of the default branch, asked once the branches are known.
        await waitFor(() =>
            expect(axios.get).toHaveBeenCalledWith(
                '/projects.development.commits.index/3',
                expect.objectContaining({
                    params: { repository_id: 1, branch: 'master', per_page: 8 },
                }),
            ),
        );
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
});
