import type { Meta, StoryObj } from '@storybook/react-vite';
import Icon from './Icon';

const meta = {
    title: 'Atoms/Icon',
    component: Icon,
    parameters: { layout: 'centered' },
    args: { name: 'Star', size: 16 },
    decorators: [
        (Story) => (
            <div className="text-[var(--text-color)]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = { args: { size: 40 } };

export const Colored: Story = {
    args: { size: 24, color: 'var(--accent-color)' },
};

export const Gallery: Story = {
    render: () => (
        <div className="flex gap-4">
            {(
                ['Bug', 'Plus', 'Search', 'Settings', 'User', 'Trash'] as const
            ).map((name) => (
                <Icon key={name} name={name} size={20} />
            ))}
        </div>
    ),
};
