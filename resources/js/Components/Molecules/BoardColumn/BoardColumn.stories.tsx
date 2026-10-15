import { DndContext } from '@dnd-kit/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { issues } from '@/stories/fixtures';
import BoardColumn from './BoardColumn';

const meta = {
    title: 'Molecules/BoardColumn',
    component: BoardColumn,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <DndContext>
                <div className="flex h-[560px]">
                    <Story />
                </div>
            </DndContext>
        ),
    ],
    args: {
        issues,
        count: issues.length,
        meta: {
            id: 'todo',
            label: 'To Do',
            hint: 'Waiting to be picked up',
            accent: '#38bdf8',
            icon: 'CircleDot',
        },
    },
} satisfies Meta<typeof BoardColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('heading', { name: 'To Do' }),
        ).toBeVisible();
    },
};

export const Empty: Story = {
    args: { issues: [], count: 0 },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No issues'),
        ).toBeVisible();
    },
};

export const Closed: Story = {
    args: {
        meta: {
            id: 'done',
            label: 'Done',
            hint: 'Done and dusted',
            accent: '#4ade80',
            icon: 'CircleCheck',
        },
    },
};
