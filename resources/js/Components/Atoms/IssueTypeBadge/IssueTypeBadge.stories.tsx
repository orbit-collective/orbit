import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { bugType, epicType, taskType } from '@/stories/fixtures';
import IssueTypeBadge from './IssueTypeBadge';

const meta = {
    title: 'Atoms/IssueTypeBadge',
    component: IssueTypeBadge,
    parameters: { layout: 'centered' },
    args: { issueType: taskType },
} satisfies Meta<typeof IssueTypeBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Task: Story = {};

export const Bug: Story = { args: { issueType: bugType } };

export const Epic: Story = { args: { issueType: epicType } };

export const Clickable: Story = {
    args: { onClick: fn() },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByText('Task'));
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
