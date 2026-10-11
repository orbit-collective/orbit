import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { comments, users } from '@/stories/fixtures';
import CommentList from './CommentList';

const meta = {
    title: 'Molecules/CommentList',
    component: CommentList,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[480px]">
                <Story />
            </div>
        ),
    ],
    args: {
        comments,
        users,
        onEdit: fn(),
        onDelete: fn(),
    },
} satisfies Meta<typeof CommentList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Jane Cooper')).toBeVisible();
        await expect(canvas.getByText('Marcus Lee')).toBeVisible();
    },
};

export const Empty: Story = {
    args: { comments: [] },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No activity yet.'),
        ).toBeVisible();
    },
};
