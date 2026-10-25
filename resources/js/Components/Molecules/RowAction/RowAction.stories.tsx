import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import RowAction from './RowAction';

const meta = {
    title: 'Molecules/RowAction',
    component: RowAction,
    parameters: { layout: 'centered' },
    args: { title: 'Edit label', icon: 'Pencil', onClick: fn() },
} satisfies Meta<typeof RowAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
    args: { title: 'Move up', icon: 'ArrowUp', disabled: true },
};

export const Danger: Story = {
    args: { title: 'Delete label', icon: 'Trash', danger: true },
};
