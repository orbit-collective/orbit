import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import ConcurrentEditNotice from './ConcurrentEditNotice';

const meta = {
    title: 'Molecules/ConcurrentEditNotice',
    component: ConcurrentEditNotice,
    args: { names: ['Ada Lovelace'], subject: 'description' },
} satisfies Meta<typeof ConcurrentEditNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnePerson: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('status'),
        ).toHaveTextContent('Ada Lovelace is editing this description too.');
    },
};

export const SeveralPeople: Story = {
    args: { names: ['Ada Lovelace', 'Grace Hopper', 'Linus Torvalds'] },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('status'),
        ).toHaveTextContent(
            'Ada Lovelace, Grace Hopper and Linus Torvalds are',
        );
    },
};

export const Nobody: Story = { args: { names: [] } };
