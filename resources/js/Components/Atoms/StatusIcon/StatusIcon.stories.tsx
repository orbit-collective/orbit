import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusIcon } from './StatusIcon';

const meta = {
    title: 'Atoms/StatusIcon',
    component: StatusIcon,
    parameters: { layout: 'centered' },
    args: { status: 'todo' },
} satisfies Meta<typeof StatusIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Todo: Story = {};

export const InProgress: Story = { args: { status: 'in_progress' } };

export const Done: Story = { args: { status: 'done' } };

export const WithoutTooltip: Story = {
    args: { status: 'done', tooltip: false },
};

export const AllStatuses: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            {['todo', 'in_progress', 'done'].map((status) => (
                <StatusIcon key={status} status={status} />
            ))}
        </div>
    ),
};
