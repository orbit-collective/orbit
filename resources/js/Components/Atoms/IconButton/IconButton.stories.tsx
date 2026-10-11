import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import IconButton from './IconButton';

const meta = {
    title: 'Atoms/IconButton',
    component: IconButton,
    parameters: { layout: 'centered' },
    args: { iconName: 'Settings', ariaLabel: 'Settings', onClick: fn() },
    decorators: [
        (Story) => (
            <div className="text-[var(--text-color)]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Colored: Story = {
    args: { iconName: 'Trash', ariaLabel: 'Delete', iconColor: '#f87171' },
};

export const Large: Story = { args: { iconSize: 24 } };

export const Disabled: Story = { args: { disabled: true } };

export const AsLink: Story = {
    args: { isLink: true, link: '/settings', ariaLabel: 'Open settings' },
};

export const RunsOnClick: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Settings' }),
        );
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
