import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { activityEntries, users } from '@/stories/fixtures';
import ActivityLogs from './ActivityLogs';

const meta = {
    title: 'Organisms/ActivityLogs',
    component: ActivityLogs,
    decorators: [
        (Story) => (
            <div className="w-[420px] bg-[var(--bg-color)] p-4">
                <Story />
            </div>
        ),
    ],
    args: { logs: activityEntries, users },
} satisfies Meta<typeof ActivityLogs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
    args: { logs: [] },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No activity yet'),
        ).toBeVisible();
    },
};

/** Consecutive entries by one person are grouped under a single header. */
export const SinglePerson: Story = {
    args: { logs: activityEntries.filter((entry) => entry.userId === 2) },
};

export const LongBody: Story = {
    args: {
        logs: [
            {
                ...activityEntries[0],
                body: 'Updated the description of #12 "Fix login redirect after session timeout when the user has multiple tabs open and the identity provider returns an expired state parameter"',
            },
        ],
    },
};
