import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
    buildCi,
    buildOverview,
    buildPullRequest,
    buildPullRequestDetail,
} from '@/tests/development';
import PullRequestsPanel from './PullRequestsPanel';

const pullRequests = [
    buildPullRequest({
        number: 21,
        title: 'Add login redirect',
        issues: [{ id: 12, number: 12, title: 'Fix the login redirect' }],
    }),
    buildPullRequest({
        number: 20,
        id: 2,
        title: 'Refactor the board',
        ci: buildCi({ state: 'failed', passed: 1, failed: 1 }),
        draft: true,
    }),
    buildPullRequest({
        number: 19,
        id: 3,
        title: 'Bump dependencies',
        state: 'merged',
        ci: null,
    }),
    buildPullRequest({
        number: 18,
        id: 4,
        title: 'Try a new sidebar',
        state: 'closed',
        ci: null,
    }),
];

const meta = {
    title: 'Organisms/PullRequestsPanel',
    component: PullRequestsPanel,
    parameters: {
        layout: 'centered',
        network: [
            { url: /pull-requests\.show/, response: buildPullRequestDetail() },
        ],
    },
    decorators: [
        (Story) => (
            <div className="w-[760px]">
                <Story />
            </div>
        ),
    ],
    args: {
        projectId: 1,
        repositoryId: 1,
        repositoryUrl: 'https://github.com/orbit-collective/orbit',
        pullRequests,
        loading: false,
        error: null,
        onRetry: () => {},
        abilities: buildOverview().abilities,
        githubLinked: true,
        version: 0,
        busy: false,
        onSetState: () => {},
        onLinkIssue: async () => true,
        onUnlinkIssue: () => {},
    },
} satisfies Meta<typeof PullRequestsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole('button', { name: /Add login redirect/ }),
        );
        await expect(await canvas.findByText('+120')).toBeInTheDocument();
    },
};

export const MergedTab: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /^Merged/ }));
        await expect(canvas.getByText('Bump dependencies')).toBeInTheDocument();
    },
};

export const Loading: Story = {
    args: { pullRequests: null, loading: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('status'),
        ).toBeInTheDocument();
    },
};

export const Failed: Story = {
    args: {
        pullRequests: null,
        error: 'Could not load pull requests from GitHub.',
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('alert'),
        ).toBeInTheDocument();
    },
};
