import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import SidebarField from './SidebarField';

const meta = {
    title: 'Molecules/SidebarField',
    component: SidebarField,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[240px]">
                <Story />
            </div>
        ),
    ],
    args: {
        label: 'Reporter',
        children: <UserBadge name="Jane Cooper" />,
    },
} satisfies Meta<typeof SidebarField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Reporter')).toBeVisible();
    },
};

export const TextValue: Story = {
    args: {
        label: 'Created',
        children: (
            <span className="text-xs text-[var(--text-color)]">3 days ago</span>
        ),
    },
};
