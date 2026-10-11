import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import IssueProperty from './IssueProperty';

const meta = {
    title: 'Molecules/IssueProperty',
    component: IssueProperty,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
    args: {
        label: 'Status',
        children: (
            <>
                <StatusDot status="in_progress" size="sm" />
                In Progress
            </>
        ),
    },
} satisfies Meta<typeof IssueProperty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Status')).toBeVisible();
    },
};

export const WithAvatar: Story = {
    args: {
        label: 'Assignee',
        children: (
            <>
                <Avatar initials="M" size="sm" />
                Marcus Lee
            </>
        ),
    },
};

/** Several rows stack into the sidebar's property list. */
export const Stacked: Story = {
    render: () => (
        <div>
            <IssueProperty label="Status">In Progress</IssueProperty>
            <IssueProperty label="Priority">High</IssueProperty>
            <IssueProperty label="Due">Oct 16</IssueProperty>
        </div>
    ),
};
