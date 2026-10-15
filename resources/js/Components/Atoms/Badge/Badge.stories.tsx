import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Badge from './Badge';

const meta = {
    title: 'Atoms/Badge',
    component: Badge,
    parameters: { layout: 'centered' },
    args: { children: 'Backlog' },
    argTypes: {
        variant: {
            control: 'inline-radio',
            options: ['default', 'outline', 'ghost', 'avatar'],
        },
    },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Backlog')).toBeVisible();
    },
};

export const Variants: Story = {
    render: (args) => (
        <div className="flex items-center gap-2">
            {(['default', 'outline', 'ghost'] as const).map((variant) => (
                <Badge key={variant} {...args} variant={variant}>
                    {variant}
                </Badge>
            ))}
        </div>
    ),
};

export const Colors: Story = {
    render: (args) => (
        <div className="flex max-w-md flex-wrap gap-2">
            {(
                [
                    'bug',
                    'feature',
                    'performance',
                    'design',
                    'ux',
                    'chore',
                    'high',
                    'medium',
                    'low',
                    'todo',
                    'in_progress',
                    'done',
                ] as const
            ).map((color) => (
                <Badge key={color} {...args} color={color}>
                    {color}
                </Badge>
            ))}
        </div>
    ),
};

/** Hover the badge to reveal the tooltip, which defaults to the badge's own content. */
export const WithTooltip: Story = {
    args: { tooltip: true, tooltipText: 'Not started yet', color: 'todo' },
};
