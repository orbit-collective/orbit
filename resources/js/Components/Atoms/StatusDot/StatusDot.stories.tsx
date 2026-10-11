import type { Meta, StoryObj } from '@storybook/react-vite';
import StatusDot from './StatusDot';

const meta = {
    title: 'Atoms/StatusDot',
    component: StatusDot,
    parameters: { layout: 'centered' },
    args: { status: 'open', size: 'md' },
    argTypes: {
        size: { control: 'inline-radio', options: ['xs', 'sm', 'md'] },
    },
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const InProgress: Story = { args: { status: 'in_progress' } };

export const Closed: Story = { args: { status: 'closed' } };

export const Statuses: Story = {
    render: (args) => (
        <div className="flex items-center gap-3">
            {(
                [
                    'open',
                    'in_progress',
                    'closed',
                    'low',
                    'medium',
                    'high',
                ] as const
            ).map((status) => (
                <StatusDot key={status} {...args} status={status} />
            ))}
        </div>
    ),
};

export const Sizes: Story = {
    render: (args) => (
        <div className="flex items-center gap-3">
            {(['xs', 'sm', 'md'] as const).map((size) => (
                <StatusDot key={size} {...args} size={size} />
            ))}
        </div>
    ),
};
