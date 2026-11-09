import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
    activityEntries,
    issueTypes,
    projects,
    users,
} from '@/stories/fixtures';
import { makeIssueRow } from '@/tests/dashboardIssues';
import { makeWidget } from '@/tests/dashboardLayout';
import { makeIssueStats } from '@/tests/issueStats';
import { makePaginated } from '@/tests/paginated';
import DashboardWidget from './DashboardWidget';

const meta = {
    title: 'Organisms/DashboardWidget',
    component: DashboardWidget,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: {
        widget: makeWidget('stat_open_issues'),
        data: {
            projects: projects.map((project) => ({
                ...project,
                issue_counts: { todo: 4, in_progress: 3, done: 5 },
            })),
            issueStats: makeIssueStats({
                high: 3,
                medium: 4,
                low: 2,
                todo: 4,
                inProgress: 3,
                done: 5,
            }),
            productivity_trend: [
                { day: 'Mon', count: 3 },
                { day: 'Tue', count: 5 },
                { day: 'Wed', count: 2 },
            ],
            activityLogs: makePaginated(activityEntries),
            users,
            issueTypes,
        },
    },
} satisfies Meta<typeof DashboardWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stat: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Open Issues'),
        ).toBeVisible();
    },
};

export const VividStat: Story = {
    args: { widget: makeWidget('stat_resolution', { variant: 'vivid' }) },
};

export const CompletionBars: Story = {
    args: { widget: makeWidget('completion') },
};

export const CompletionRing: Story = {
    args: { widget: makeWidget('completion', { variant: 'ring' }) },
};

export const PriorityBreakdown: Story = {
    args: { widget: makeWidget('priority_breakdown') },
};

export const Projects: Story = {
    args: { widget: makeWidget('projects') },
};

/** Until the data of a widget arrives it is a placeholder. */
export const WaitingForData: Story = {
    args: {
        widget: makeWidget('stat_critical'),
        data: { projects: [] },
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByTestId('widget-placeholder'),
        ).toBeVisible();
    },
};

export const GlassStat: Story = {
    args: { widget: makeWidget('stat_projects', { variant: 'glass' }) },
};

export const OutlineStat: Story = {
    args: { widget: makeWidget('stat_critical', { variant: 'outline' }) },
};

/** Which issues the statistic counts is an option of the widget. */
export const InProgressCount: Story = {
    args: {
        widget: makeWidget('stat_open_issues', {
            config: {
                count: 'in_progress',
                color: 'warning',
                icon: 'on',
                description: 'off',
            },
        }),
    },
};

export const ResolutionAsCount: Story = {
    args: {
        widget: makeWidget('stat_resolution', {
            config: { show: 'count', color: 'accent' },
        }),
    },
};

export const TrendBars: Story = {
    args: { widget: makeWidget('trend') },
    decorators: [
        (Story) => (
            <div className="flex h-[320px] w-[480px]">
                <Story />
            </div>
        ),
    ],
};

export const TrendLine: Story = {
    args: {
        widget: makeWidget('trend', {
            variant: 'line',
            config: { values: 'always' },
        }),
    },
    decorators: [
        (Story) => (
            <div className="flex h-[320px] w-[480px]">
                <Story />
            </div>
        ),
    ],
};

export const TrendArea: Story = {
    args: {
        widget: makeWidget('trend', {
            variant: 'area',
            config: { grid: 'off' },
        }),
    },
    decorators: [
        (Story) => (
            <div className="flex h-[320px] w-[480px]">
                <Story />
            </div>
        ),
    ],
};

export const CompletionStacked: Story = {
    args: { widget: makeWidget('completion', { variant: 'stacked' }) },
};

export const PriorityList: Story = {
    args: { widget: makeWidget('priority_breakdown', { variant: 'list' }) },
};

export const PriorityDonut: Story = {
    args: {
        widget: makeWidget('priority_breakdown', {
            variant: 'donut',
            config: { sort: 'count' },
        }),
    },
};

export const ProjectsGrid: Story = {
    args: {
        widget: makeWidget('projects', {
            variant: 'grid',
            config: { limit: 5, sort: 'progress' },
        }),
    },
    decorators: [
        (Story) => (
            <div className="flex h-[360px] w-[640px]">
                <Story />
            </div>
        ),
    ],
};

export const ProjectsCompact: Story = {
    args: {
        widget: makeWidget('projects', {
            variant: 'compact',
            config: { limit: 10, sort: 'name' },
        }),
    },
};

export const ActivityCompact: Story = {
    args: {
        widget: makeWidget('activity', {
            variant: 'compact',
            config: { pagination: 'off' },
        }),
    },
    decorators: [
        (Story) => (
            <div className="flex h-[360px] w-[480px]">
                <Story />
            </div>
        ),
    ],
};

const issueRows = [
    makeIssueRow(1, {
        title: 'Fix login redirect after session timeout',
        endDate: '2026-11-08',
    }),
    makeIssueRow(2, {
        title: 'Add pagination to the activity feed',
        endDate: '2026-11-12',
    }),
    makeIssueRow(3, {
        title: 'Write the release notes',
        endDate: null,
        priority: null,
    }),
];

const secondWave = {
    ...meta.args.data,
    issueStats: makeIssueStats({
        high: 3,
        todo: 4,
        inProgress: 3,
        done: 5,
        overdue: 2,
        dueSoon: 4,
        assigned: 7,
        types: [
            { name: 'Task', color: '#3b82f6', icon: 'CheckSquare', count: 8 },
            { name: 'Bug', color: '#ef4444', icon: 'Bug', count: 3 },
            { name: 'Feature', color: '#8b5cf6', icon: 'Sparkles', count: 1 },
        ],
    }),
    myIssues: issueRows,
    deadlines: issueRows,
    auth: { user: { id: 1, name: 'Jane Cooper' } },
};

export const OverdueStat: Story = {
    args: { widget: makeWidget('stat_overdue'), data: secondWave },
};

export const AssignedStat: Story = {
    args: {
        widget: makeWidget('stat_assigned', { variant: 'vivid' }),
        data: secondWave,
    },
};

export const DueSoonStat: Story = {
    args: {
        widget: makeWidget('stat_due_soon', { variant: 'glass' }),
        data: secondWave,
    },
};

export const MyIssues: Story = {
    args: { widget: makeWidget('my_issues'), data: secondWave },
    decorators: [
        (Story) => (
            <div className="flex h-[320px] w-[520px]">
                <Story />
            </div>
        ),
    ],
};

export const MyIssueCards: Story = {
    args: {
        widget: makeWidget('my_issues', { variant: 'cards' }),
        data: secondWave,
    },
    decorators: [
        (Story) => (
            <div className="flex h-[360px] w-[680px]">
                <Story />
            </div>
        ),
    ],
};

export const Deadlines: Story = {
    args: {
        widget: makeWidget('deadlines', {
            config: {
                scope: 'all',
                range: 30,
                overdue: 'on',
                limit: 10,
                header: 'on',
            },
        }),
        data: secondWave,
    },
    decorators: [
        (Story) => (
            <div className="flex h-[320px] w-[520px]">
                <Story />
            </div>
        ),
    ],
};

export const DeadlinesTimeline: Story = {
    args: {
        widget: makeWidget('deadlines', {
            variant: 'timeline',
            config: {
                scope: 'all',
                range: 30,
                overdue: 'on',
                limit: 10,
                header: 'on',
            },
        }),
        data: secondWave,
    },
    decorators: [
        (Story) => (
            <div className="flex h-[360px] w-[520px]">
                <Story />
            </div>
        ),
    ],
};

export const IssueTypes: Story = {
    args: {
        widget: makeWidget('types_breakdown', { variant: 'donut' }),
        data: secondWave,
    },
};

export const WeekSummary: Story = {
    args: {
        widget: makeWidget('week_summary', { variant: 'sparkline' }),
        data: secondWave,
    },
    decorators: [
        (Story) => (
            <div className="flex h-[190px] w-[360px]">
                <Story />
            </div>
        ),
    ],
};

export const QuickActions: Story = {
    args: { widget: makeWidget('quick_actions'), data: secondWave },
    decorators: [
        (Story) => (
            <div className="flex h-[200px] w-[480px]">
                <Story />
            </div>
        ),
    ],
};

export const Welcome: Story = {
    args: { widget: makeWidget('greeting'), data: secondWave },
    decorators: [
        (Story) => (
            <div className="flex h-[130px] w-[720px]">
                <Story />
            </div>
        ),
    ],
};
