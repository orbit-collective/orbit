import { DndContext } from '@dnd-kit/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, within } from 'storybook/test';
import { issues, makeIssue } from '@/stories/fixtures';
import { BoardCard, BoardCardOverlay } from './BoardCard';

const meta = {
    title: 'Organisms/BoardCard',
    component: BoardCard,
    decorators: [
        (Story) => (
            <DndContext>
                <div className="w-[300px] bg-[var(--bg-color)] p-3">
                    <Story />
                </div>
            </DndContext>
        ),
    ],
    args: { issue: issues[0], onClick: fn(), isClosed: false },
} satisfies Meta<typeof BoardCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        // dnd-kit's pointer sensor intercepts simulated pointer sequences, so
        // dispatch the click directly.
        await fireEvent.click(
            within(canvasElement).getByText(args.issue.title),
        );
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};

export const Unassigned: Story = { args: { issue: issues[1] } };

export const Closed: Story = { args: { issue: issues[4], isClosed: true } };

export const ManyLabelsAndLongTitle: Story = {
    args: {
        issue: makeIssue({
            title: 'Investigate why the board column drag handle is not reachable by keyboard on Safari and in high contrast mode',
            labels: ['bug', 'design', 'ux', 'performance', 'customer-request'],
        }),
    },
};

/** Without a workflow status the card falls back to the plain status badge. */
export const WithoutWorkflowStatus: Story = {
    args: { issue: makeIssue({ workflowStatus: undefined }) },
};

/** The floating copy that follows the pointer while a card is dragged. */
export const DragOverlay: Story = {
    render: (args) => (
        <BoardCardOverlay issue={args.issue} isClosed={args.isClosed} />
    ),
};
