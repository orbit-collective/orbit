import { DndContext } from '@dnd-kit/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within, waitFor } from 'storybook/test';
import { makeWidget } from '@/tests/dashboardLayout';
import { GRID_CLASS } from '@/utils/dashboardLayout';
import WidgetEditFrame from './WidgetEditFrame';

const meta = {
    title: 'Molecules/WidgetEditFrame',
    component: WidgetEditFrame,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <DndContext>
                <div className="w-[640px]">
                    <div className={GRID_CLASS}>
                        <Story />
                    </div>
                </div>
            </DndContext>
        ),
    ],
    args: {
        widget: makeWidget('trend', { width: 120, height: 70 }),
        label: 'Productivity Trend',
        icon: 'ChartLine',
        minWidth: 30,
        minHeight: 56,
        snap: true,
        selected: false,
        onSelect: fn(),
        onToggleVisible: fn(),
        onResize: fn(),
        children: (
            <div className="p-4 text-sm text-(--text-color)">
                Widget content
            </div>
        ),
    },
} satisfies Meta<typeof WidgetEditFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitFor(() =>
            expect(
                within(canvasElement).getByTestId('widget-drag-surface'),
            ).toBeVisible(),
        );
    },
};

export const Selected: Story = { args: { selected: true } };

export const Hidden: Story = {
    args: { widget: makeWidget('trend', { visible: false, height: 70 }) },
};
