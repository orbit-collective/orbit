import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { notifications } from '@/stories/fixtures';
import NotificationsPopup from './NotificationsPopup';

const meta = {
    title: 'Organisms/NotificationsPopup',
    component: NotificationsPopup,
    parameters: {
        layout: 'fullscreen',
        inertia: { props: { notifications } },
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
    parameters: { inertia: { props: { notifications: [] } } },
};

export const AllRead: Story = {
    parameters: {
        inertia: {
            props: {
                notifications: notifications.map((item) => ({
                    ...item,
                    read: true,
                })),
            },
        },
    },
};

/** Picking a type tab narrows the list to that kind of notification. */
export const FilteredByType: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /error/i }));
        await expect(canvas.getByText('Import failed')).toBeVisible();
        await expect(
            canvas.queryByText('GitHub sync is failing'),
        ).not.toBeInTheDocument();
    },
};
