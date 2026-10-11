import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { issues, makeIssue } from '@/stories/fixtures';
import IssueElement from './IssueElement';

const meta = {
    title: 'Molecules/IssueElement',
    component: IssueElement,
    parameters: { layout: 'padded' },
    // List rows are <tr>s, so they need a table around them.
    decorators: [
        (Story, { args }) =>
            args.type === 'board' ? (
                <div className="w-[300px]">
                    <Story />
                </div>
            ) : (
                <table className="w-full">
                    <tbody>
                        <Story />
                    </tbody>
                </table>
            ),
    ],
    args: {
        issue: issues[0],
        type: 'list',
    },
} satisfies Meta<typeof IssueElement>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `type="list"` renders the table row. */
export const List: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByText(issues[0].title),
        ).toBeVisible();
    },
};

export const ListClosed: Story = {
    args: { issue: issues[4] },
};

/** `type="board"` renders the kanban card. */
export const Board: Story = {
    args: { type: 'board' },
};

export const BoardUnassigned: Story = {
    args: { type: 'board', issue: issues[1] },
};

export const LongTitle: Story = {
    args: {
        issue: makeIssue({
            title: 'An exceptionally long issue title that should be truncated rather than wrapping across the entire row of the list view',
        }),
    },
};
