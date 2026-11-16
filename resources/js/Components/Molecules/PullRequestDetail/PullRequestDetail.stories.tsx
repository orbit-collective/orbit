import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
    buildOverview,
    buildPullRequest,
    buildPullRequestDetail,
} from '@/tests/development';
import PullRequestDetail from './PullRequestDetail';

const meta = {
    title: 'Molecules/PullRequestDetail',
    component: PullRequestDetail,
    parameters: {
        layout: 'centered',
        network: [
            { url: /pull-requests\.show/, response: buildPullRequestDetail() },
        ],
    },
    decorators: [
        (Story) => (
            <div className="w-[680px]">
                <Story />
            </div>
        ),
    ],
    args: {
        projectId: 1,
        repositoryId: 1,
        pullRequest: buildPullRequest({
            issues: [{ id: 12, number: 12, title: 'Fix the login redirect' }],
        }),
        abilities: buildOverview().abilities,
        githubLinked: true,
        version: 0,
        busy: false,
        onSetState: () => {},
        onLinkIssue: () => {},
        onUnlinkIssue: () => {},
    },
} satisfies Meta<typeof PullRequestDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Manager: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('+120')).toBeVisible();
        await expect(
            canvas.getByRole('button', { name: 'Close pull request' }),
        ).toBeVisible();
    },
};

export const ReadOnly: Story = {
    args: { abilities: { manage: false, createBranch: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('+120')).toBeVisible();
        await expect(
            canvas.queryByRole('button', { name: 'Close pull request' }),
        ).toBeNull();
    },
};

export const GithubAccountNotLinked: Story = {
    args: { githubLinked: false },
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByText(
                'Link your GitHub account in Settings to change pull requests.',
            ),
        ).toBeVisible();
    },
};

export const LoadFailed: Story = {
    parameters: {
        network: [{ url: /pull-requests\.show/, status: 502, response: {} }],
    },
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByRole('alert'),
        ).toBeVisible();
    },
};
