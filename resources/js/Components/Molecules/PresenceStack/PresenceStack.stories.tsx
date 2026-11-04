import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import PresenceStack from './PresenceStack';

const users = [
    { id: 1, name: 'Ada Lovelace', avatar: null },
    { id: 2, name: 'Grace Hopper', avatar: null },
    { id: 3, name: 'Linus Torvalds', avatar: null },
    { id: 4, name: 'Margaret Hamilton', avatar: null },
    { id: 5, name: 'Dennis Ritchie', avatar: null },
    { id: 6, name: 'Barbara Liskov', avatar: null },
];

const meta = {
    title: 'Molecules/PresenceStack',
    component: PresenceStack,
    parameters: { layout: 'centered' },
    args: { users: users.slice(0, 3) },
} satisfies Meta<typeof PresenceStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('group', {
                name: /Also viewing: Ada Lovelace, Grace Hopper/,
            }),
        ).toBeVisible();
    },
};

export const Overflow: Story = {
    args: { users },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('+2')).toBeVisible();
    },
};

export const Alone: Story = { args: { users: [] } };
