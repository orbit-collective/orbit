import { DndContext } from '@dnd-kit/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { expect, within } from 'storybook/test';
import WidgetEditFrame from './WidgetEditFrame';

const meta = {
    title: 'Molecules/WidgetEditFrame',
    component: WidgetEditFrame,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <DndContext>
                <div className="w-[360px]">
                    <Story />
                </div>
            </DndContext>
        ),
    ],
    args: {
        id: 'trend',
        label: 'Productivity Trend',
        hidden: false,
        selected: false,
        canMoveUp: true,
        canMoveDown: true,
        onSelect: fn(),
        onMove: fn(),
        onToggleVisible: fn(),
        children: (
            <div className="h-32 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4 text-sm text-[var(--text-color)]">
                Widget content
            </div>
        ),
    },
} satisfies Meta<typeof WidgetEditFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', {
                name: 'Drag Productivity Trend',
            }),
        ).toBeVisible();
    },
};

export const Selected: Story = { args: { selected: true } };

export const Hidden: Story = { args: { hidden: true } };

export const FirstWidget: Story = { args: { canMoveUp: false } };
