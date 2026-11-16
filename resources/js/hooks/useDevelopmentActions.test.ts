import { act, renderHook } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useDevelopmentActions } from './useDevelopmentActions';

vi.mock('axios');

const addAlert = vi.fn();
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert }),
}));

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: Record<string, number>) =>
            `/${name}/${Object.values(params).join('/')}`,
    ),
);

const onChanged = vi.fn();

beforeEach(() => {
    addAlert.mockReset();
    onChanged.mockReset();
    vi.mocked(axios.post).mockReset().mockResolvedValue({ data: {} });
    vi.mocked(axios.delete).mockReset().mockResolvedValue({ data: {} });
});

const setup = () =>
    renderHook(() => useDevelopmentActions(5, 9, onChanged)).result;

describe('useDevelopmentActions', () => {
    test('closing and reopening post the state, toast and read again', async () => {
        const result = setup();

        let worked = false;
        await act(async () => {
            worked = await result.current.setPullRequestState(7, 'closed');
        });
        await act(async () => {
            await result.current.setPullRequestState(7, 'open');
        });

        expect(worked).toBe(true);
        expect(axios.post).toHaveBeenNthCalledWith(
            1,
            '/projects.development.pull-requests.state/5/7',
            { repository_id: 9, state: 'closed' },
        );
        expect(addAlert).toHaveBeenNthCalledWith(
            1,
            'Closed pull request #7.',
            'success',
        );
        expect(addAlert).toHaveBeenNthCalledWith(
            2,
            'Reopened pull request #7.',
            'success',
        );
        expect(onChanged).toHaveBeenCalledTimes(2);
    });

    test('merging posts the method, the title and the head commit, and toasts', async () => {
        const result = setup();

        await act(async () => {
            await result.current.mergePullRequest(
                7,
                { method: 'squash', commitTitle: 'Add login (#7)' },
                'abc1234',
            );
        });
        await act(async () => {
            await result.current.mergePullRequest(
                7,
                { method: 'rebase' },
                'abc1234',
            );
        });

        expect(axios.post).toHaveBeenNthCalledWith(
            1,
            '/projects.development.pull-requests.merge/5/7',
            {
                repository_id: 9,
                method: 'squash',
                head_sha: 'abc1234',
                commit_title: 'Add login (#7)',
            },
        );
        expect(axios.post).toHaveBeenNthCalledWith(
            2,
            '/projects.development.pull-requests.merge/5/7',
            {
                repository_id: 9,
                method: 'rebase',
                head_sha: 'abc1234',
            },
        );
        expect(addAlert).toHaveBeenCalledWith(
            'Merged pull request #7.',
            'success',
        );
        expect(onChanged).toHaveBeenCalledTimes(2);
    });

    test('linking and unlinking an issue', async () => {
        const result = setup();

        await act(async () => {
            await result.current.linkIssue(7, 42);
        });
        await act(async () => {
            await result.current.unlinkIssue(7, 42);
        });

        expect(axios.post).toHaveBeenCalledWith(
            '/projects.development.pull-requests.issues.store/5/7',
            { repository_id: 9, issue_id: 42 },
        );
        expect(axios.delete).toHaveBeenCalledWith(
            '/projects.development.pull-requests.issues.destroy/5/7/42',
            { params: { repository_id: 9 } },
        );
        expect(addAlert).toHaveBeenCalledWith(
            'Linked the issue to pull request #7.',
            'success',
        );
        expect(addAlert).toHaveBeenCalledWith(
            'Unlinked the issue from pull request #7.',
            'success',
        );
    });

    test('creating a branch sends the base only when there is one', async () => {
        const result = setup();

        await act(async () => {
            await result.current.createBranch('feat/x', 'master');
        });
        await act(async () => {
            await result.current.createBranch('feat/y', null);
        });

        expect(axios.post).toHaveBeenNthCalledWith(
            1,
            '/projects.development.branches.store/5',
            { repository_id: 9, name: 'feat/x', base_branch: 'master' },
        );
        expect(axios.post).toHaveBeenNthCalledWith(
            2,
            '/projects.development.branches.store/5',
            { repository_id: 9, name: 'feat/y' },
        );
    });

    test('a refusal is shown with the server message and does not read again', async () => {
        vi.mocked(axios.post).mockRejectedValue({
            response: {
                data: { errors: { development: ['Link your GitHub account'] } },
            },
        });
        const result = setup();

        let worked = true;
        await act(async () => {
            worked = await result.current.setPullRequestState(7, 'closed');
        });

        expect(worked).toBe(false);
        expect(addAlert).toHaveBeenCalledWith(
            'Link your GitHub account',
            'error',
        );
        expect(onChanged).not.toHaveBeenCalled();
        expect(result.current.busy).toBe(false);
    });

    test('is busy while a write is in flight', async () => {
        let finish!: () => void;
        vi.mocked(axios.post).mockReturnValue(
            new Promise<unknown>((resolve) => {
                finish = () => resolve({ data: {} });
            }) as never,
        );
        const result = setup();

        let pending!: Promise<boolean>;
        act(() => {
            pending = result.current.linkIssue(7, 1);
        });
        expect(result.current.busy).toBe(true);

        await act(async () => {
            finish();
            await pending;
        });
        expect(result.current.busy).toBe(false);
    });
});
