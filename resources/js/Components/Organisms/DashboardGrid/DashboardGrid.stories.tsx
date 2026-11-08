import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import {
    activityEntries,
    issueTypes,
    projects,
    users,
} from '@/stories/fixtures';
import {
    makeDashboardLayout,
    DASHBOARD_CATALOG,
} from '@/tests/dashboardLayout';
import { makeIssueStats } from '@/tests/issueStats';
import { makePaginated } from '@/tests/paginated';
import DashboardGrid from './DashboardGrid';

const meta = {
    title: 'Organisms/DashboardGrid',
    component: DashboardGrid,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="p-6">
                <Story />
            </div>
        ),
    ],
    args: {
        widgets: makeDashboardLayout().widgets,
        catalog: DASHBOARD_CATALOG,
        data: {
            projects,
            issueStats: makeIssueStats({
                high: 3,
                todo: 4,
                inProgress: 3,
                done: 5,
            }),
            productivity_trend: [
                { day: 'Mon', count: 3 },
                { day: 'Tue', count: 5 },
            ],
            activityLogs: makePaginated(activityEntries),
            users,
            issueTypes,
        },
        onSelect: fn(),
        onReorder: fn(),
        onToggleVisible: fn(),
        onResize: fn(),
    },
} satisfies Meta<typeof DashboardGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Open Issues'),
        ).toBeVisible();
    },
};

/** While editing every widget gets a drag handle, hidden ones included. */
export const Editing: Story = {
    args: { editing: true, selectedId: 'trend' },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getAllByTestId('widget-drag-header'),
        ).toHaveLength(9);
    },
};
