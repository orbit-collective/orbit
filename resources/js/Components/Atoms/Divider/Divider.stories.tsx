import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Divider from './Divider';

const meta = {
    title: 'Atoms/Divider',
    component: Divider,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-80 text-[var(--text-color)]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const WithLabel: Story = { args: { label: 'or' } };

export const Vertical: Story = {
    args: { orientation: 'vertical' },
    render: (args) => (
        <div className="flex items-center gap-3 text-sm">
            Left
            <Divider {...args} />
            Right
        </div>
    ),
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('separator'),
        ).toHaveAttribute('aria-orientation', 'vertical');
    },
};
