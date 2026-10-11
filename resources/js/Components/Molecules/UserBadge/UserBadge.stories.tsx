import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import UserBadge from './UserBadge';

const meta = {
    title: 'Molecules/UserBadge',
    component: UserBadge,
    parameters: { layout: 'centered' },
    args: { name: 'Jane Cooper', email: 'jane@example.com' },
} satisfies Meta<typeof UserBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getAllByText('Jane Cooper')[0],
        ).toBeVisible();
    },
};

export const WithEmail: Story = { args: { showDetails: true } };

export const AvatarOnly: Story = { args: { showName: false } };

export const Sizes: Story = {
    render: (args) => (
        <div className="flex flex-col gap-3">
            {(['sm', 'md', 'lg'] as const).map((size) => (
                <UserBadge key={size} {...args} size={size} showDetails />
            ))}
        </div>
    ),
};

export const LongName: Story = {
    args: {
        name: 'Alexandria Montgomery-Featherstonehaugh',
        showDetails: true,
    },
    decorators: [
        (Story) => (
            <div className="w-[180px]">
                <Story />
            </div>
        ),
    ],
};
