import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { taskType } from '@/stories/fixtures';

const statuses = taskType.statuses ?? [];
import WorkflowStatusBadge from './WorkflowStatusBadge';

const meta = {
    title: 'Atoms/WorkflowStatusBadge',
    component: WorkflowStatusBadge,
    parameters: { layout: 'centered' },
    args: { status: statuses[0] },
} satisfies Meta<typeof WorkflowStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStatuses: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
                <WorkflowStatusBadge key={status.id} status={status} />
            ))}
        </div>
    ),
};

export const Clickable: Story = {
    args: { onClick: fn() },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByText(statuses[0].name),
        );
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
