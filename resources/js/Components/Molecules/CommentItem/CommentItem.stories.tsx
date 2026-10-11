import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { comments, users } from '@/stories/fixtures';
import CommentItem from './CommentItem';

const [own, others] = comments;

const meta = {
    title: 'Molecules/CommentItem',
    component: CommentItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[480px]">
                <Story />
            </div>
        ),
    ],
    args: {
        comment: own,
        users,
        onEdit: fn(),
        onDelete: fn(),
    },
} satisfies Meta<typeof CommentItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The author can edit in place and delete. */
export const Own: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Jane Cooper')).toBeVisible();
        await expect(
            canvas.getByRole('button', { name: 'Delete comment' }),
        ).toBeInTheDocument();
    },
};

/** Without edit/delete permission the comment is read-only. */
export const ReadOnly: Story = {
    args: { comment: others },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).queryByRole('button', {
                name: 'Delete comment',
            }),
        ).not.toBeInTheDocument();
    },
};

export const WithMention: Story = {
    args: {
        comment: {
            ...others,
            body: 'Thanks @Jane Cooper, can you review this?',
        },
    },
};

export const LongBody: Story = {
    args: {
        comment: {
            ...own,
            body: 'Steps to reproduce:\n1. Open the app and sign in.\n2. Leave the tab idle until the session expires.\n3. Click any link.\n\nExpected: land on the original page after logging in again. Actual: the dashboard is shown and the target URL is lost, which is especially annoying for deep links shared by teammates.',
        },
    },
};
