import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildCommit } from '@/tests/development';
import CommitItem from './CommitItem';

const meta = {
    title: 'Molecules/CommitItem',
    component: CommitItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ul className="m-0 w-[380px] list-none p-0">
                <Story />
            </ul>
        ),
    ],
    args: { commit: buildCommit() },
} satisfies Meta<typeof CommitItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('deadbee')).toBeVisible();
    },
};

export const WithoutGithubAccount: Story = {
    args: { commit: buildCommit({ author: null, authorName: 'Grace Hopper' }) },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/Grace Hopper/),
        ).toBeVisible();
    },
};
