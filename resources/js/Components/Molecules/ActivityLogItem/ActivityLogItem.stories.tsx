import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { activityEntries, issueTypes, users } from '@/stories/fixtures';
import ActivityLogItem from './ActivityLogItem';

const [first, second, third] = activityEntries;

const meta = {
    title: 'Molecules/ActivityLogItem',
    component: ActivityLogItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[440px]">
                <Story />
            </div>
        ),
    ],
    args: {
        users,
        issueTypes,
        group: {
            key: 'g-1',
            userId: 2,
            userName: second.userName,
            userAvatar: null,
            createdAt: second.createdAt,
            entries: [second, third],
        },
    },
} satisfies Meta<typeof ActivityLogItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One person's consecutive entries are grouped under a single header. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Marcus Lee'),
        ).toBeVisible();
    },
};

export const SingleEntry: Story = {
    args: {
        group: {
            key: 'g-2',
            userId: 1,
            userName: first.userName,
            userAvatar: null,
            createdAt: first.createdAt,
            entries: [first],
        },
    },
};

export const UnknownUser: Story = {
    args: {
        group: {
            key: 'g-3',
            userId: null,
            userName: null,
            userAvatar: null,
            createdAt: first.createdAt,
            entries: [first],
        },
    },
};
