import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisualCard } from './VisualCard';

const meta = {
    title: 'Atoms/VisualCard',
    component: VisualCard,
    parameters: { layout: 'centered' },
    args: {
        children: (
            <>
                <h3 className="text-sm font-semibold text-[var(--text-color)]">
                    Track work
                </h3>
                <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                    Keep every issue, project and teammate in one place.
                </p>
            </>
        ),
    },
    decorators: [
        (Story) => (
            <div className="w-72">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof VisualCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tall: Story = { args: { className: 'h-48' } };

export const LongContent: Story = {
    args: {
        children: (
            <p className="text-sm text-[var(--text-color)]">
                {'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
                    4,
                )}
            </p>
        ),
    },
};
