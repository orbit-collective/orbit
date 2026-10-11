import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import FilterButton from './FilterButton';

const meta = {
    title: 'Molecules/FilterButton',
    component: FilterButton,
    parameters: { layout: 'centered' },
    args: {
        icon: 'Flag',
        label: 'Priority',
        onClick: fn(),
    },
} satisfies Meta<typeof FilterButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(within(canvasElement).getByRole('button'));
        await expect(args.onClick).toHaveBeenCalled();
    },
};

/** An active filter shows its selection count in the accent color. */
export const Active: Story = {
    args: { isActive: true, value: '2' },
};

export const WithoutIcon: Story = {
    args: { icon: undefined, label: 'Assignee' },
};

/** Without `onClick` there is no chevron unless `hasMenu` asks for one. */
export const Static: Story = {
    args: { onClick: undefined, value: 'High' },
};
