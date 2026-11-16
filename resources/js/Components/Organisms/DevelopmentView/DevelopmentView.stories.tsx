import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
    buildBranch,
    buildCommit,
    buildInsights,
    buildOverview,
    buildPullRequest,
    buildPullRequestDetail,
} from '@/tests/development';
import DevelopmentView from './DevelopmentView';

const project = {
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple' as const,
    created_at: 0,
    updated_at: 0,
};

const network = [
    {
        url: /pull-requests\.index/,
        response: {
            pullRequests: [
                buildPullRequest({
                    title: 'Add login redirect',
                    issues: [
                        { id: 12, number: 12, title: 'Fix the login redirect' },
                    ],
                }),
                buildPullRequest({
                    number: 8,
                    id: 2,
                    title: 'Bump dependencies',
                    state: 'merged',
                    mergedAt: new Date().toISOString(),
                    ci: null,
                }),
            ],
        },
    },
    { url: /pull-requests\.show/, response: buildPullRequestDetail() },
    { url: /insights\.show/, response: buildInsights() },
    {
        url: /branches\.index/,
        response: {
            branches: [
                buildBranch(),
                buildBranch({
                    name: 'feat/login',
                    isDefault: false,
                    protected: false,
                }),
            ],
        },
    },
    {
        url: /commits\.index/,
        response: {
            commits: [
                buildCommit(),
                buildCommit({ sha: 'f00dbabe1234', message: 'test: cover it' }),
            ],
        },
    },
];

const meta = {
    title: 'Organisms/DevelopmentView',
    component: DevelopmentView,
    parameters: { layout: 'fullscreen', network },
    decorators: [
        (Story) => (
            <div className="flex h-[900px] flex-col px-4">
                <Story />
            </div>
        ),
    ],
    args: { project, development: buildOverview() },
} satisfies Meta<typeof DevelopmentView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            await canvas.findByText('Add login redirect'),
        ).toBeInTheDocument();
        await expect(await canvas.findByText('Commit activity')).toBeInTheDocument();
    },
};

export const ReadOnlyMember: Story = {
    args: {
        development: buildOverview({
            abilities: { manage: false, createBranch: false },
        }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            await canvas.findByText('Add login redirect'),
        ).toBeInTheDocument();
        await expect(
            canvas.queryByRole('button', { name: 'New branch' }),
        ).toBeNull();
    },
};

export const NotConnected: Story = {
    args: {
        development: buildOverview({ connected: false, repositories: [] }),
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('heading', {
                name: /Connect GitHub/,
            }),
        ).toBeInTheDocument();
    },
};

export const GitHubDown: Story = {
    parameters: {
        network: [
            {
                url: /development\./,
                status: 502,
                response: {
                    errors: { development: ['GitHub could not be reached.'] },
                },
            },
        ],
    },
    play: async ({ canvasElement }) => {
        await expect(
            (
                await within(canvasElement).findAllByText(
                    'GitHub could not be reached.',
                )
            ).length,
        ).toBeGreaterThan(0);
    },
};
