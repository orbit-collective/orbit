import {
    DashboardCatalogEntry,
    DashboardLayoutProp,
    DashboardSavedLayout,
    DashboardWidget,
    DashboardWidgetType,
} from '@/types/Dashboard';

type DashboardWidgetOption = DashboardCatalogEntry['options'][number];

const toggle = (
    key: string,
    label: string,
    initial: 'on' | 'off' = 'on',
): DashboardWidgetOption => ({
    key,
    label,
    options: ['on', 'off'],
    default: initial,
    labels: { on: 'Show', off: 'Hide' },
});

const entry = (
    type: DashboardWidgetType,
    label: string,
    props: string[],
    overrides: Partial<DashboardCatalogEntry> = {},
): DashboardCatalogEntry => ({
    type,
    label,
    description: `${label} description`,
    icon: 'Activity',
    variants: ['default'],
    minWidth: 30,
    defaultWidth: 40,
    minHeight: 40,
    defaultHeight: 85,
    options: [],
    props,
    ...overrides,
});

/** The server's widget catalog, as a test fixture. */
export const DASHBOARD_CATALOG: DashboardCatalogEntry[] = [
    entry('stat', 'Statistic', ['projects', 'issueStats'], {
        variants: ['default', 'vivid', 'accent', 'glass', 'outline'],
        minWidth: 20,
        defaultWidth: 30,
        minHeight: 20,
        defaultHeight: 32,
        options: [
            {
                key: 'metric',
                label: 'Shows',
                options: [
                    'projects',
                    'open_issues',
                    'critical',
                    'resolution',
                    'overdue',
                    'assigned',
                    'due_soon',
                ],
                default: 'open_issues',
                labels: {
                    projects: 'Active Projects',
                    open_issues: 'Open Issues',
                    critical: 'Critical Tasks',
                    resolution: 'Resolution Rate',
                    overdue: 'Overdue Issues',
                    assigned: 'Assigned to Me',
                    due_soon: 'Due Soon',
                },
            },
            {
                key: 'count',
                label: 'Count',
                options: ['open', 'todo', 'in_progress', 'done', 'all'],
                default: 'open',
                labels: {
                    open: 'Open',
                    todo: 'To do',
                    in_progress: 'In progress',
                    done: 'Done',
                    all: 'All',
                },
                when: { metric: ['open_issues'] },
            },
            {
                key: 'show',
                label: 'As',
                options: ['value', 'fraction', 'percent'],
                default: 'value',
                labels: {
                    value: 'Number',
                    fraction: 'Part / whole',
                    percent: 'Percent',
                },
                when: {
                    metric: [
                        'open_issues',
                        'critical',
                        'resolution',
                        'overdue',
                        'assigned',
                        'due_soon',
                    ],
                },
            },
            {
                key: 'color',
                label: 'Color',
                kind: 'color',
                options: [
                    'auto',
                    'accent',
                    'success',
                    'warning',
                    'error',
                    'info',
                ],
                default: 'auto',
                labels: { auto: 'Automatic' },
            },
            toggle('icon', 'Icon'),
            toggle('description', 'Description'),
        ],
    }),
    entry('trend', 'Productivity Trend', ['productivity_trend'], {
        variants: ['bars', 'line', 'area'],
        defaultWidth: 80,
        minHeight: 56,
        options: [
            toggle('header', 'Title'),
            toggle('grid', 'Grid lines'),
            {
                key: 'values',
                label: 'Values',
                options: ['hover', 'always'],
                default: 'hover',
                labels: { hover: 'On hover', always: 'Always' },
            },
            toggle('today', 'Highlight today'),
            {
                key: 'color',
                label: 'Color',
                kind: 'color',
                options: ['accent', 'success', 'warning', 'error', 'info'],
                default: 'accent',
            },
        ],
    }),
    entry('completion', 'Completion Ratio', ['issueStats'], {
        variants: ['bars', 'ring', 'stacked'],
        minHeight: 70,
        options: [toggle('header', 'Title'), toggle('tier', 'Status label')],
    }),
    entry('priority_breakdown', 'Priority Breakdown', ['issueStats'], {
        variants: ['bar', 'list', 'donut'],
        defaultWidth: 120,
        defaultHeight: 60,
        options: [
            toggle('header', 'Title'),
            toggle('noPriority', 'No priority'),
            toggle('percent', 'Percentages'),
            {
                key: 'sort',
                label: 'Order',
                options: ['priority', 'count'],
                default: 'priority',
                labels: { priority: 'By priority', count: 'By count' },
            },
        ],
    }),
    entry(
        'activity',
        'Recent Work Activity',
        ['activityLogs', 'users', 'issueTypes'],
        {
            variants: ['feed', 'compact'],
            defaultWidth: 80,
            defaultHeight: 170,
            options: [
                toggle('header', 'Title'),
                toggle('pagination', 'Pagination'),
            ],
        },
    ),
    entry('projects', 'Projects Directory', ['projects'], {
        variants: ['cards', 'grid', 'compact'],
        defaultHeight: 170,
        options: [
            {
                key: 'limit',
                label: 'Projects shown',
                options: [3, 5, 10, 15],
                default: 3,
            },
            {
                key: 'sort',
                label: 'Order',
                options: ['latest', 'name', 'progress', 'issues'],
                default: 'latest',
                labels: {
                    latest: 'Latest',
                    name: 'Name',
                    progress: 'Progress',
                    issues: 'Issues',
                },
            },
            toggle('header', 'Title'),
            toggle('viewAll', 'View all link'),
        ],
    }),
    entry('my_issues', 'My Issues', ['myIssues'], {
        variants: ['list', 'compact', 'cards'],
        defaultWidth: 60,
        minHeight: 60,
        defaultHeight: 120,
        options: [
            {
                key: 'limit',
                label: 'Issues shown',
                options: [5, 10, 15],
                default: 5,
            },
            {
                key: 'sort',
                label: 'Order',
                options: ['priority', 'due', 'updated'],
                default: 'priority',
                labels: {
                    priority: 'Priority',
                    due: 'Due date',
                    updated: 'Last updated',
                },
            },
            toggle('header', 'Title'),
            toggle('type', 'Issue type'),
            toggle('project', 'Project'),
            toggle('priority', 'Priority'),
            toggle('due', 'Due date'),
        ],
    }),
    entry('deadlines', 'Upcoming Deadlines', ['deadlines'], {
        variants: ['list', 'timeline', 'week'],
        defaultWidth: 60,
        minHeight: 60,
        defaultHeight: 120,
        options: [
            {
                key: 'scope',
                label: 'Whose issues',
                options: ['mine', 'all'],
                default: 'mine',
                labels: { mine: 'Assigned to me', all: 'All projects' },
            },
            {
                key: 'range',
                label: 'Looking ahead',
                options: [7, 14, 30],
                default: 14,
                labels: { '7': '7 days', '14': '14 days', '30': '30 days' },
            },
            toggle('overdue', 'Overdue issues'),
            {
                key: 'limit',
                label: 'Issues shown',
                options: [5, 10, 15],
                default: 10,
            },
            toggle('header', 'Title'),
        ],
    }),
    entry('types_breakdown', 'Issue Types', ['issueStats'], {
        variants: ['bar', 'list', 'donut'],
        minHeight: 60,
        defaultHeight: 85,
        options: [
            toggle('header', 'Title'),
            toggle('percent', 'Percentages'),
            {
                key: 'sort',
                label: 'Order',
                options: ['count', 'name'],
                default: 'count',
                labels: { count: 'By count', name: 'By name' },
            },
        ],
    }),
    entry('week_summary', 'Week Summary', ['productivity_trend'], {
        variants: ['numbers', 'sparkline', 'bars'],
        defaultHeight: 60,
        options: [
            toggle('header', 'Title'),
            toggle('average', 'Daily average'),
            toggle('best', 'Best day'),
            {
                key: 'color',
                label: 'Color',
                kind: 'color',
                options: ['accent', 'success', 'warning', 'error', 'info'],
                default: 'accent',
            },
        ],
    }),
    entry('quick_actions', 'Quick Actions', [], {
        variants: ['grid', 'list', 'bar'],
        defaultWidth: 60,
        minHeight: 24,
        defaultHeight: 36,
        options: [
            toggle('header', 'Title'),
            toggle('labels', 'Labels'),
            {
                key: 'color',
                label: 'Color',
                kind: 'color',
                options: ['accent', 'success', 'warning', 'error', 'info'],
                default: 'accent',
            },
            toggle('newProject', 'New project'),
            toggle('search', 'Search'),
            toggle('projects', 'Projects'),
            toggle('notifications', 'Notifications'),
            toggle('editDashboard', 'Edit dashboard'),
            toggle('shortcuts', 'Keyboard shortcuts', 'off'),
        ],
    }),
    entry('greeting', 'Welcome', ['issueStats'], {
        variants: ['banner', 'compact', 'minimal'],
        defaultWidth: 120,
        minHeight: 24,
        defaultHeight: 36,
        options: [
            toggle('name', 'Your name'),
            toggle('date', 'Date'),
            toggle('summary', 'Day in numbers'),
            toggle('icon', 'Time of day icon'),
            {
                key: 'color',
                label: 'Color',
                kind: 'color',
                options: ['accent', 'success', 'warning', 'error', 'info'],
                default: 'accent',
            },
        ],
    }),
];

export const makeWidget = (
    type: DashboardWidgetType,
    overrides: Partial<DashboardWidget> = {},
): DashboardWidget => {
    const catalogEntry = DASHBOARD_CATALOG.find((item) => item.type === type)!;

    return {
        id: type,
        type,
        variant: catalogEntry.variants[0],
        width: catalogEntry.defaultWidth,
        height: catalogEntry.defaultHeight,
        visible: true,
        config: Object.fromEntries(
            catalogEntry.options.map((option) => [option.key, option.default]),
        ),
        ...overrides,
    };
};

/** A statistic widget showing `metric`, with the id the default layout gives it. */
export const makeStat = (
    metric: string,
    overrides: Partial<DashboardWidget> = {},
): DashboardWidget => {
    const base = makeWidget('stat');

    return {
        ...base,
        id: `stat_${metric}`,
        ...overrides,
        config: { ...base.config, metric, ...overrides.config },
    };
};

/** The default layout: every widget, in the server's default order. */
export const makeDashboardLayout = (
    widgets?: DashboardWidget[],
): DashboardLayoutProp => ({
    widgets: widgets ?? [
        makeStat('projects'),
        makeStat('open_issues'),
        makeStat('critical'),
        makeStat('resolution', { config: { show: 'percent' } }),
        ...(
            [
                'trend',
                'completion',
                'activity',
                'projects',
                'priority_breakdown',
            ] as DashboardWidgetType[]
        ).map((type) => makeWidget(type)),
    ],
    catalog: DASHBOARD_CATALOG,
});

export const makeSavedLayout = (
    id: number,
    name: string,
    widgets: DashboardWidget[] = makeDashboardLayout().widgets,
): DashboardSavedLayout => ({ id, name, widgets });
