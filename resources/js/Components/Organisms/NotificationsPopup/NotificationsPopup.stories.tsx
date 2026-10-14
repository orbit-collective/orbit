import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { notifications } from '@/stories/fixtures';
import NotificationsPopup from './NotificationsPopup';

const meta = {
    title: 'Organisms/NotificationsPopup',
    component: NotificationsPopup,
    parameters: {
        layout: 'fullscreen',
        inertia: {
            props: {
                notifications,
                notificationUnreadCount: notifications.filter(
                    (item) => !item.read,
                ).length,
            },
        },
    },
} satisfies Meta<typeof NotificationsPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('GitHub sync is failing'),
        ).toBeVisible();
    },
};

export const Empty: Story = {
    parameters: {
        inertia: {
            props: { notifications: [], notificationUnreadCount: 0 },
        },
    },
};

export const AllRead: Story = {
    parameters: {
        inertia: {
            props: {
                notifications: notifications.map((item) => ({
                    ...item,
                    read: true,
                })),
                notificationUnreadCount: 0,
            },
        },
    },
};

/** Picking a type tab asks the server for that kind of notification. */
export const FilteredByType: Story = {
    parameters: {
        network: [
            {
                url: '/notifications',
                method: 'GET',
                response: {
                    data: notifications.filter((item) => item.type === 'error'),
                    next_cursor: null,
                    unread_count: 2,
                },
            },
        ],
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /error/i }));
        await expect(await canvas.findByText('Import failed')).toBeVisible();
        await expect(
            canvas.queryByText('GitHub sync is failing'),
        ).not.toBeInTheDocument();
    },
};

/** Selection mode swaps the delete buttons for checkboxes and shows the bulk bar. */
export const SelectingSeveral: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByLabelText('Select notifications'));
        await userEvent.click(canvas.getByText('Select all'));
        await expect(
            canvas.getByText(`${notifications.length} selected`),
        ).toBeVisible();
    },
};

/** A full first page offers older notifications on demand. */
export const WithMorePages: Story = {
    parameters: {
        inertia: {
            props: {
                notifications: Array.from({ length: 20 }, (_, index) => ({
                    ...notifications[index % notifications.length],
                    id: 100 - index,
                })),
                notificationUnreadCount: 12,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Load more'),
        ).toBeVisible();
    },
};
