import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import type { SavedFilter } from '@/hooks/useSavedFilters';
import SavedFiltersDropdown from './SavedFiltersDropdown';

const savedFilters: SavedFilter[] = [
    {
        id: 1,
        project_id: 1,
        name: 'My open bugs',
        context: 'project_1',
        query_params: { status: 'open', priority: 'high' },
    },
    {
        id: 2,
        project_id: 1,
        name: 'Frontend work',
        context: 'project_1',
        query_params: { labels: 'design,ux', assignee: 'jane' },
    },
];

const meta = {
    title: 'Molecules/SavedFiltersDropdown',
    component: SavedFiltersDropdown,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[440px] w-[360px] justify-center">
                <Story />
            </div>
        ),
    ],
    args: {
        savedFilters,
        queryParams: {},
        projectId: 1,
        isOpen: true,
        onOpenChange: fn(),
    },
} satisfies Meta<typeof SavedFiltersDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSavedViews: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText('My open bugs')).toBeVisible();
    },
};

export const Empty: Story = {
    args: { savedFilters: [] },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText('No saved views yet')).toBeVisible();
    },
};

/** Active filters can be named and saved as a new view; a matching view is highlighted. */
export const ActiveFilters: Story = {
    args: { queryParams: { status: 'open', priority: 'high' } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText('Clear all')).toBeVisible();
        await expect(
            body.getByPlaceholderText('Name this view…'),
        ).toBeVisible();
    },
};

export const Closed: Story = {
    args: { isOpen: false },
};

/** The open state belongs to the parent toolbar; this wires it to local state. */
export const Controlled: Story = {
    args: { isOpen: false },
    render: function Render(args) {
        const [open, setOpen] = useState(false);
        return (
            <SavedFiltersDropdown
                {...args}
                isOpen={open}
                onOpenChange={setOpen}
            />
        );
    },
};
