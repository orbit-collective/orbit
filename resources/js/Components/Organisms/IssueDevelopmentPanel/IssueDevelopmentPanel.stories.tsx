import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { LinkedPullRequest } from '@/types/Issues';
import IssueDevelopmentPanel from './IssueDevelopmentPanel';

const pullRequest = (
    overrides: Partial<LinkedPullRequest> = {},
): LinkedPullRequest => ({
    provider: 'github',
    number: 241,
    title: 'Keep the redirect target across session timeouts',
    repositoryOwner: 'orbit-collective',
    repositoryName: 'orbit',
    url: 'https://github.com/orbit-collective/orbit/pull/241',
    sourceBranch: 'fix/login-redirect',
    targetBranch: 'master',
    status: 'open',
    draft: false,
    checkStatus: 'passed',
    reviewStatus: 'approved',
    ...overrides,
});

const repositories = [
    { id: 1, owner: 'orbit-collective', name: 'orbit' },
    { id: 2, owner: 'orbit-collective', name: 'orbit-mobile' },
];

const meta = {
    title: 'Organisms/IssueDevelopmentPanel',
    component: IssueDevelopmentPanel,
    args: { pullRequests: [pullRequest()] },
    decorators: [
        (Story) => (
            <div className="w-[300px] bg-[var(--bg-color)] p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof IssueDevelopmentPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PullRequestStates: Story = {
    args: {
        pullRequests: [
            pullRequest(),
            pullRequest({
                number: 242,
                title: 'Draft: rework session handling',
                url: 'https://github.com/orbit-collective/orbit/pull/242',
                draft: true,
                checkStatus: 'pending',
                reviewStatus: null,
            }),
            pullRequest({
                number: 243,
                title: 'Merged change',
                url: 'https://github.com/orbit-collective/orbit/pull/243',
                status: 'merged',
                reviewStatus: 'commented',
            }),
            pullRequest({
                number: 244,
                title: 'Closed without merging',
                url: 'https://github.com/orbit-collective/orbit/pull/244',
                status: 'closed',
                checkStatus: 'failed',
                reviewStatus: 'changes_requested',
            }),
        ],
    },
};

/** A pre-v0.9.2 link has no status, title or branches, so none are invented. */
export const LegacyLink: Story = {
    args: {
        pullRequests: [
            pullRequest({
                title: null,
                sourceBranch: null,
                targetBranch: null,
                status: null,
                draft: null,
                checkStatus: null,
                reviewStatus: null,
            }),
        ],
    },
};

export const CreateBranch: Story = {
    args: {
        pullRequests: [],
        repositories,
        defaultBranchName: 'orbit-12-fix-login-redirect',
        onCreateBranch: fn(),
        onCreatePullRequest: fn(),
    },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole('button', { name: 'Create branch' }),
        );
        await userEvent.click(
            canvas.getByRole('button', { name: 'Create branch' }),
        );
        await expect(args.onCreateBranch).toHaveBeenCalledWith(
            expect.objectContaining({
                repositoryId: 1,
                name: 'orbit-12-fix-login-redirect',
            }),
        );
    },
};

export const LinkGithubAccount: Story = {
    args: {
        pullRequests: [],
        repositories,
        requiresGithubAccountLink: true,
    },
};
