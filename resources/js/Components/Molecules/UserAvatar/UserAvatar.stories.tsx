import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import UserAvatar from './UserAvatar';

const meta = {
    title: 'Molecules/UserAvatar',
    component: UserAvatar,
    args: { initials: 'JD', size: 'lg' },
} satisfies Meta<typeof UserAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Without a userId there is no preview to load, so this is the plain avatar.
export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('JD')).toBeVisible();
    },
};
