import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { makeDashboardLayout } from '@/tests/dashboardLayout';
import LayoutPreview from './LayoutPreview';

const meta = {
    title: 'Molecules/LayoutPreview',
    component: LayoutPreview,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[260px]">
                <Story />
            </div>
        ),
    ],
    args: { widgets: makeDashboardLayout().widgets },
} satisfies Meta<typeof LayoutPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getAllByTestId('layout-preview-block'),
        ).toHaveLength(9);
    },
};

export const Empty: Story = { args: { widgets: [] } };
