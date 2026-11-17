import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import PullRequestMergeBox from './PullRequestMergeBox';

const meta = {
    title: 'Molecules/PullRequestMergeBox',
    component: PullRequestMergeBox,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[620px]">
                <Story />
            </div>
        ),
    ],
    args: {
        number: 7,
        title: 'Add login redirect',
        busy: false,
        onMerge: async () => true,
    },
} satisfies Meta<typeof PullRequestMergeBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Merge this pull request'),
        ).toBeInTheDocument();
    },
};

export const Open: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /^Merge…/ }));
        await canvas.findByRole('radiogroup');
        await expect(canvas.getAllByRole('radio')).toHaveLength(3);
    },
};

export const Squash: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /^Merge…/ }));
        await userEvent.click(
            await canvas.findByRole('radio', { name: /Squash/ }),
        );
        await expect(canvas.getByLabelText('Commit title')).toHaveValue(
            'Add login redirect (#7)',
        );
    },
};

export const Conflicts: Story = {
    args: {
        blockedReason:
            'This pull request has conflicts that must be resolved before it can be merged.',
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: /^Merge…/ }),
        ).toBeDisabled();
    },
};

export const Merging: Story = {
    args: { busy: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: /^Merge…/ }),
        ).toBeDisabled();
    },
};
