import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { users } from '@/stories/fixtures';
import CommentForm from './CommentForm';

const meta = {
    title: 'Molecules/CommentForm',
    component: CommentForm,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[480px]">
                <Story />
            </div>
        ),
    ],
    args: {
        onSubmit: fn(),
        users,
    },
} satisfies Meta<typeof CommentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const textbox =
            within(canvasElement).getByPlaceholderText('Leave a comment...');
        await userEvent.type(textbox, 'Looks good to me');
        await expect(textbox).toHaveValue('Looks good to me');
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Post comment' }),
        );
        await expect(args.onSubmit).toHaveBeenCalledWith(
            'Looks good to me',
            [],
        );
    },
};

export const Submitting: Story = {
    args: { isSubmitting: true },
};

export const WithoutUsers: Story = {
    args: { users: [] },
};
