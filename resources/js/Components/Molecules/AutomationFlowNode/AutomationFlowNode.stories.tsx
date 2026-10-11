import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import AutomationFlowNode from './AutomationFlowNode';

const meta = {
    title: 'Molecules/AutomationFlowNode',
    component: AutomationFlowNode,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
    args: {
        icon: 'Zap',
        color: '#f59e0b',
        eyebrow: 'Trigger',
        title: 'Issue created',
        subtitle: 'In project Orbit',
        onClick: fn(),
    },
} satisfies Meta<typeof AutomationFlowNode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', {
                name: /issue created/i,
            }),
        );
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};

export const Selected: Story = { args: { selected: true } };

/** No trigger picked yet: a warning icon marks the node as unfinished. */
export const Incomplete: Story = {
    args: { title: 'Pick a trigger', subtitle: undefined, incomplete: true },
};

/** Reorderable and removable nodes show a drag handle and a delete button. */
export const Editable: Story = {
    args: {
        eyebrow: 'Action',
        icon: 'Tag',
        color: '#38bdf8',
        title: 'Add label "bug"',
        dragHandleProps: {},
        onDelete: fn(),
    },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', {
                name: 'Remove Add label "bug"',
            }),
        );
        await expect(args.onDelete).toHaveBeenCalledTimes(1);
    },
};

export const Dragging: Story = {
    args: { isDragging: true, dragHandleProps: {} },
};

export const DropTarget: Story = { args: { isDropTarget: true } };
