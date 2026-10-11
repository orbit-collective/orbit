import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { labels, users } from '@/stories/fixtures';
import FilterDropdown from './FilterDropdown';

const meta = {
    title: 'Molecules/FilterDropdown',
    component: FilterDropdown,
    parameters: {
        layout: 'centered',
        inertia: { url: '/projects/1/issues' },
    },
    decorators: [
        (Story) => (
            <ProjectLabelsProvider labels={labels}>
                <div className="flex h-[420px] items-start">
                    <Story />
                </div>
            </ProjectLabelsProvider>
        ),
    ],
    args: {
        type: 'status',
        queryParams: {},
        users,
        isOpen: false,
        onOpenChange: () => {},
    },
    render: function Render(args) {
        const [isOpen, setIsOpen] = useState(args.isOpen);

        return (
            <FilterDropdown
                {...args}
                isOpen={isOpen}
                onOpenChange={setIsOpen}
            />
        );
    },
} satisfies Meta<typeof FilterDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Status: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: /status/i }),
        ).toBeVisible();
    },
};

/** An applied filter reads from the query string and shows its count. */
export const PriorityApplied: Story = {
    args: { type: 'priority', queryParams: { priority: 'high,medium' } },
};

export const AssigneeOpen: Story = {
    args: { type: 'assignee', isOpen: true },
};

export const LabelsOpen: Story = {
    args: { type: 'labels', isOpen: true, queryParams: { labels: 'bug' } },
};
