import {
    DashboardCatalogEntry,
    DashboardLayoutProp,
    DashboardWidget,
    DashboardWidgetType,
} from '@/types/Dashboard';

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
    spans: [4, 6, 12],
    defaultSpan: 4,
    options: [],
    props,
    ...overrides,
});

const STAT = {
    variants: ['default', 'vivid', 'accent'],
    spans: [3, 4, 6, 12],
    defaultSpan: 3,
};

/** The server's widget catalog, as a test fixture. */
export const DASHBOARD_CATALOG: DashboardCatalogEntry[] = [
    entry('stat_projects', 'Active Projects', ['projects'], STAT),
    entry('stat_open_issues', 'Open Issues', ['issueStats'], STAT),
    entry('stat_critical', 'Critical Tasks', ['issueStats'], STAT),
    entry('stat_resolution', 'Resolution Rate', ['issueStats'], STAT),
    entry('trend', 'Productivity Trend', ['productivity_trend'], {
        spans: [6, 8, 12],
        defaultSpan: 8,
    }),
    entry('completion', 'Completion Ratio', ['issueStats'], {
        variants: ['bars', 'ring'],
    }),
    entry('priority_breakdown', 'Priority Breakdown', ['issueStats'], {
        defaultSpan: 12,
    }),
    entry(
        'activity',
        'Recent Work Activity',
        ['activityLogs', 'users', 'issueTypes'],
        {
            spans: [6, 8, 12],
            defaultSpan: 8,
        },
    ),
    entry('projects', 'Projects Directory', ['projects'], {
        variants: ['cards', 'compact'],
        options: [
            {
                key: 'limit',
                label: 'Projects shown',
                options: [3, 5, 10],
                default: 3,
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
        span: catalogEntry.defaultSpan,
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
