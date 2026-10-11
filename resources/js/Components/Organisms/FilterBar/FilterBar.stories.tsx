import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { project, users } from '@/stories/fixtures';
import FilterBar from './FilterBar';

const meta = {
    title: 'Organisms/FilterBar',
    component: FilterBar,
    parameters: {
        layout: 'fullscreen',
        // Wide enough for the filter dropdowns, which hide below the lg breakpoint.
        inertia: { url: '/projects/1/issues' },
    },
    args: {
        project,
        users,
        queryParams: {},
        savedFilters: [],
        onPanelOpenChange: fn(),
    },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSearch: Story = {
    args: { queryParams: { search: 'login redirect' } },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByPlaceholderText(/search issue title/i),
        ).toHaveValue('login redirect');
    },
};

export const WithSavedFilters: Story = {
    args: {
        savedFilters: [
            {
                id: 1,
                project_id: 1,
                name: 'My open bugs',
                context: 'issues',
                query_params: { status: 'open', labels: 'bug' },
            },
            {
                id: 2,
                project_id: 1,
                name: 'High priority',
                context: 'issues',
                query_params: { priority: 'high' },
            },
        ],
    },
};

export const ActiveFilters: Story = {
    args: {
        queryParams: { status: 'open', priority: 'high', labels: 'bug' },
    },
};

export const TypingSearches: Story = {
    play: async ({ canvasElement }) => {
        const input =
            within(canvasElement).getByPlaceholderText(/search issue title/i);
        await userEvent.type(input, 'board');
        await expect(input).toHaveValue('board');
    },
};
