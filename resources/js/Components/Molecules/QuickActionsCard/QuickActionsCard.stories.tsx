import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import QuickActionsCard from './QuickActionsCard';

const meta = {
    title: 'Molecules/QuickActionsCard',
    component: QuickActionsCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[240px] w-[480px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QuickActionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grid: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: 'New project' }),
        ).toBeVisible();
    },
};

export const List: Story = { args: { variant: 'list' } };

export const Bar: Story = { args: { variant: 'bar' } };

export const IconsOnly: Story = {
    args: { variant: 'bar', showLabels: false, color: 'info' },
};

export const WithShortcuts: Story = {
    args: { variant: 'list', enabled: { shortcuts: true }, color: 'success' },
};

export const NothingOn: Story = {
    args: {
        enabled: {
            newProject: false,
            search: false,
            projects: false,
            notifications: false,
            editDashboard: false,
            shortcuts: false,
        },
    },
};
