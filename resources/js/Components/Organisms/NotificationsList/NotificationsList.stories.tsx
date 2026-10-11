import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { notifications } from '@/stories/fixtures';
import NotificationsList from './NotificationsList';

const meta = {
    title: 'Organisms/NotificationsList',
    component: NotificationsList,
    args: {
        notifications,
        onMarkAsRead: fn(),
        onRemove: fn(),
    },
    decorators: [
        (Story) => (
            <div className="w-[420px] max-w-full rounded-2xl bg-[var(--bg-dark-color)] p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof NotificationsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
    args: { notifications: [] },
};

export const AllRead: Story = {
    args: {
        notifications: notifications.map((item) => ({ ...item, read: true })),
    },
};

/** More items than fit scroll inside the list. */
export const Overflowing: Story = {
    args: {
        notifications: Array.from({ length: 4 }, (_, copy) =>
            notifications.map((item) => ({
                ...item,
                id: item.id + copy * 10,
            })),
        ).flat(),
    },
};
