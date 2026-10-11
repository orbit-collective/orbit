import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriorityIcon } from './PriorityIcon';

const meta = {
    title: 'Atoms/PriorityIcon',
    component: PriorityIcon,
    parameters: { layout: 'centered' },
    args: { priority: 'high' },
    argTypes: {
        priority: {
            control: 'inline-radio',
            options: ['high', 'medium', 'low', 'none'],
        },
    },
} satisfies Meta<typeof PriorityIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {};

export const Medium: Story = { args: { priority: 'medium' } };

export const Low: Story = { args: { priority: 'low' } };

/** Anything that is not high, medium or low renders the dashed "no priority" ring. */
export const NoPriority: Story = { args: { priority: 'none' } };

export const WithoutTooltip: Story = { args: { tooltip: false } };

export const AllPriorities: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            {(['high', 'medium', 'low', 'none'] as const).map((priority) => (
                <PriorityIcon key={priority} priority={priority} />
            ))}
        </div>
    ),
};
