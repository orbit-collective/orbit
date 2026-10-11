import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { labels } from '@/stories/fixtures';
import EditableLabelList from './EditableLabelList';

const meta = {
    title: 'Molecules/EditableLabelList',
    component: EditableLabelList,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ProjectLabelsProvider labels={labels}>
                <div className="h-[320px] w-[360px]">
                    <Story />
                </div>
            </ProjectLabelsProvider>
        ),
    ],
    args: {
        labels: labels.slice(0, 2).map((label) => label.name),
        onSave: fn(),
    },
} satisfies Meta<typeof EditableLabelList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Edit labels' }),
        );
    },
};

export const Empty: Story = {
    args: { labels: [] },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('None')).toBeVisible();
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: 'Edit labels' }),
        ).toBeDisabled();
    },
};
