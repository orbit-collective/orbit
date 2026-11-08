import {
    DashboardCatalogEntry,
    DashboardLayoutProp,
    DashboardSavedLayout,
    DashboardWidget,
    DashboardWidgetType,
} from '@/types/Dashboard';

type DashboardWidgetOption = DashboardCatalogEntry['options'][number];

const toggle = (key: string, label: string): DashboardWidgetOption => ({
    key,
    label,
    options: ['on', 'off'],
    default: 'on',
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

const statOptions = (color: string): DashboardWidgetOption[] => [
    {
        key: 'color',
        label: 'Color',
        kind: 'color',
        options: ['accent', 'success', 'warning', 'error', 'info'],
        default: color,
    },
    toggle('icon', 'Icon'),
    toggle('description', 'Description'),
];

const stat = (color: string, extra: DashboardWidgetOption[] = []) => ({
    variants: ['default', 'vivid', 'accent', 'glass', 'outline'],
    minWidth: 20,
    defaultWidth: 30,
    minHeight: 20,
    defaultHeight: 32,
    options: [...extra, ...statOptions(color)],
});

/** The server's widget catalog, as a test fixture. */
export const DASHBOARD_CATALOG: DashboardCatalogEntry[] = [
    entry('stat_projects', 'Active Projects', ['projects'], stat('accent')),
    entry(
        'stat_open_issues',
        'Open Issues',
        ['issueStats'],
        stat('info', [
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
            },
        ]),
    ),
    entry('stat_critical', 'Critical Tasks', ['issueStats'], stat('error')),
    entry(
        'stat_resolution',
        'Resolution Rate',
        ['issueStats'],
        stat('success', [
            {
                key: 'show',
                label: 'Show',
                options: ['percent', 'count'],
                default: 'percent',
                labels: { percent: 'Percent', count: 'Done / all' },
            },
        ]),
    ),
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
        minHeight: 60,
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

/** The default layout: every widget, in the server's default order. */
export const makeDashboardLayout = (
    widgets?: DashboardWidget[],
): DashboardLayoutProp => ({
    widgets:
        widgets ??
        (
            [
                'stat_projects',
                'stat_open_issues',
                'stat_critical',
                'stat_resolution',
                'trend',
                'completion',
                'activity',
                'projects',
                'priority_breakdown',
            ] as DashboardWidgetType[]
        ).map((type) => makeWidget(type)),
    catalog: DASHBOARD_CATALOG,
});

export const makeSavedLayout = (
    id: number,
    name: string,
    widgets: DashboardWidget[] = makeDashboardLayout().widgets,
): DashboardSavedLayout => ({ id, name, widgets });
