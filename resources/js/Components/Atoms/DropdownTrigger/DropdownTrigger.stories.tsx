import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import DropdownTrigger from './DropdownTrigger';

const meta = {
    title: 'Atoms/DropdownTrigger',
    component: DropdownTrigger,
    parameters: { layout: 'centered' },
    args: { label: 'Status', onClick: fn(), className: 'w-48' },
    argTypes: {
        variant: { control: 'inline-radio', options: ['default', 'pill'] },
    },
} satisfies Meta<typeof DropdownTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
    args: { isOpen: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button')).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    },
};

export const Pill: Story = {
    args: { variant: 'pill', icon: 'ListFilter', label: 'Priority' },
};

export const PillOpenWithBadge: Story = {
    args: {
        variant: 'pill',
        icon: 'ListFilter',
        label: 'Labels',
        isOpen: true,
        badge: 3,
    },
};

export const Disabled: Story = { args: { disabled: true } };

export const LongLabel: Story = {
    args: {
        label: 'A very long selected value that must be truncated nicely',
    },
};

export const RunsOnClick: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button'));
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
