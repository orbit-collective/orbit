import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import Icon from '@/Components/Atoms/Icon/Icon';
import Button from './Button';

const meta = {
    title: 'Atoms/Button',
    component: Button,
    parameters: { layout: 'centered' },
    args: {
        children: 'Create issue',
        type: 'button',
        onClick: fn(),
    },
    argTypes: {
        variant: { control: 'inline-radio', options: ['default', 'danger'] },
        isBox: { control: 'boolean' },
        isDisabled: { control: 'boolean' },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The primary action, filled with the accent color picked in the toolbar. */
export const Primary: Story = {};

export const Danger: Story = {
    args: { variant: 'danger', children: 'Delete issue' },
};

export const Disabled: Story = {
    args: { isDisabled: true },
};

export const WithIcon: Story = {
    args: {
        children: (
            <>
                <Icon name="Plus" size={14} />
                New issue
            </>
        ),
    },
};

/** `isBox` drops the padding and fill so the button can wrap an icon or a custom box. */
export const Box: Story = {
    args: {
        isBox: true,
        className: 'h-8 w-8',
        'aria-label': 'Add',
        children: <Icon name="Plus" size={16} />,
    },
};

export const RunsOnClick: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Create issue' }),
        );
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};

export const DoesNotFireWhenDisabled: Story = {
    args: { isDisabled: true },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button'));
        await expect(args.onClick).not.toHaveBeenCalled();
    },
};
