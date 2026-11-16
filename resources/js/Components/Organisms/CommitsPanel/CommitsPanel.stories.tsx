import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildCommit } from '@/tests/development';
import CommitsPanel from './CommitsPanel';

const meta = {
    title: 'Organisms/CommitsPanel',
    component: CommitsPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: {
        commits: [
            buildCommit(),
            buildCommit({
                sha: 'f00dbabe1234',
                message: 'test: cover the redirect',
                author: null,
                authorName: 'Grace Hopper',
            }),
        ],
        branch: 'master',
        repositoryUrl: 'https://github.com/orbit-collective/orbit',
        error: null,
        onRetry: () => {},
    },
} satisfies Meta<typeof CommitsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('test: cover the redirect'),
        ).toBeVisible();
    },
};

export const Loading: Story = {
    args: { commits: null },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('status')).toBeVisible();
    },
};
