import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import PullRequestMergeForm from './PullRequestMergeForm';

const meta = {
    title: 'Molecules/PullRequestMergeForm',
    component: PullRequestMergeForm,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: {
        number: 7,
        title: 'Add login redirect',
        busy: false,
        onMerge: async () => true,
        onCancel: () => {},
    },
} satisfies Meta<typeof PullRequestMergeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MergeCommit: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByLabelText('Commit title'),
        ).toHaveValue('Merge pull request #7');
    },
};

export const Squash: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Squash' }));
        await expect(canvas.getByLabelText('Commit title')).toHaveValue(
            'Add login redirect (#7)',
        );
    },
};

export const Merging: Story = {
    args: { busy: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: 'Merging…' }),
        ).toBeDisabled();
    },
};
