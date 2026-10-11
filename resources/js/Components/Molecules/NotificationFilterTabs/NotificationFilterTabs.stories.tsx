import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import NotificationFilterTabs from './NotificationFilterTabs';

const meta = {
    title: 'Molecules/NotificationFilterTabs',
    component: NotificationFilterTabs,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: { activeFilter: 'all', onChange: fn() },
} satisfies Meta<typeof NotificationFilterTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByRole('button', { name: 'All' }),
        ).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(canvas.getByRole('button', { name: 'Warning' }));
        await expect(args.onChange).toHaveBeenCalledWith('warning');
    },
};

export const ErrorSelected: Story = {
    args: { activeFilter: 'error' },
};

/** On narrow containers the tabs scroll horizontally. */
export const Narrow: Story = {
    decorators: [
        (Story) => (
            <div className="w-[220px]">
                <Story />
            </div>
        ),
    ],
};
