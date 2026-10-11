import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { VisualCardHeader } from './VisualCardHeader';

const meta = {
    title: 'Molecules/VisualCardHeader',
    component: VisualCardHeader,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Completion',
        description: 'How much of the work is done.',
    },
} satisfies Meta<typeof VisualCardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Completion'),
        ).toBeVisible();
    },
};

export const LongDescription: Story = {
    args: {
        description:
            'A longer explanation that wraps onto several lines to show how the muted description text flows under the title.',
    },
};
