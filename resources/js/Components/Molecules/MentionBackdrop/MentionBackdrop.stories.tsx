import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import MentionBackdrop from './MentionBackdrop';

const meta = {
    title: 'Molecules/MentionBackdrop',
    component: MentionBackdrop,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="relative h-16 w-[420px] rounded-xl border border-(--border-color) bg-(--bg-color-hover) text-sm text-(--text-color)">
                <Story />
            </div>
        ),
    ],
    args: {
        text: 'Hi @Jane Cooper, please look at #12',
        ranges: [
            { start: 3, length: 12, userId: 1, name: 'Jane Cooper' },
            {
                start: 32,
                length: 3,
                userId: 12,
                name: 'Fix login',
                kind: 'issue',
            },
        ],
        className: 'px-4 pt-3 pb-2 text-sm',
    },
} satisfies Meta<typeof MentionBackdrop>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Normally transparent text behind a textarea; it is made visible here so the highlight can be seen. */
export const Default: Story = {
    render: (args) => (
        <div className="[&_[data-testid=mention-backdrop]]:text-(--text-gray-color) [&_mark]:text-(--text-color)">
            <MentionBackdrop {...args} />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const marks = canvasElement.querySelectorAll('mark');

        await expect(marks).toHaveLength(2);
        await expect(
            within(canvasElement).getByTestId('mention-backdrop'),
        ).toBeInTheDocument();
    },
};
