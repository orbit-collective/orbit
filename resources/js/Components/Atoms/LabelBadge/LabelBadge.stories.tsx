import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { labels } from '@/stories/fixtures';
import LabelBadge from './LabelBadge';

const meta = {
    title: 'Atoms/LabelBadge',
    component: LabelBadge,
    parameters: { layout: 'centered' },
    args: { label: labels[0].name },
    decorators: [
        (Story) => (
            <ProjectLabelsProvider labels={labels}>
                <Story />
            </ProjectLabelsProvider>
        ),
    ],
} satisfies Meta<typeof LabelBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The dot color comes from the project's label record. */
export const Default: Story = {};

/** A name without a project label record falls back to a hashed color. */
export const UnknownLabel: Story = { args: { label: 'needs-design' } };

export const AllLabels: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
                <LabelBadge key={label.id} label={label.name} />
            ))}
        </div>
    ),
};

export const Clickable: Story = {
    args: { onClick: fn() },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByText(labels[0].name));
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
