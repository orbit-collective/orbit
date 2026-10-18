import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriorityIcon } from './PriorityIcon';

const high = { name: 'High', color: '#f44336', icon: 'SignalHigh' };
const medium = { name: 'Medium', color: '#ff9800', icon: 'SignalMedium' };
const low = { name: 'Low', color: '#4caf50', icon: 'SignalLow' };

const meta = {
    title: 'Atoms/PriorityIcon',
    component: PriorityIcon,
    parameters: { layout: 'centered' },
    args: { priority: high },
} satisfies Meta<typeof PriorityIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {};

export const Medium: Story = { args: { priority: medium } };

export const Low: Story = { args: { priority: low } };

/** A project can name, color and pick the icon of its own priorities. */
export const CustomPriority: Story = {
    args: { priority: { name: 'Blocker', color: '#9c27b0', icon: 'Flame' } },
};

/** Without a priority the dashed "no priority" ring is drawn. */
export const NoPriority: Story = { args: { priority: null } };

export const WithoutTooltip: Story = { args: { tooltip: false } };

export const AllPriorities: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            {[high, medium, low, null].map((priority) => (
                <PriorityIcon
                    key={priority?.name ?? 'none'}
                    priority={priority}
                />
            ))}
        </div>
    ),
};
