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
    minWidth: 30,
    defaultWidth: 40,
    minHeight: 40,
    defaultHeight: 85,
    options: [],
    props,
    ...overrides,
});

const STAT = {
    variants: ['default', 'vivid', 'accent'],
    minWidth: 20,
    defaultWidth: 30,
    minHeight: 20,
    defaultHeight: 32,
};

/** The server's widget catalog, as a test fixture. */
export const DASHBOARD_CATALOG: DashboardCatalogEntry[] = [
    entry('stat_projects', 'Active Projects', ['projects'], STAT),
    entry('stat_open_issues', 'Open Issues', ['issueStats'], STAT),
    entry('stat_critical', 'Critical Tasks', ['issueStats'], STAT),
    entry('stat_resolution', 'Resolution Rate', ['issueStats'], STAT),
    entry('trend', 'Productivity Trend', ['productivity_trend'], {
        defaultWidth: 80,
        minHeight: 56,
    }),
    entry('completion', 'Completion Ratio', ['issueStats'], {
        variants: ['bars', 'ring'],
        minHeight: 60,
    }),
    entry('priority_breakdown', 'Priority Breakdown', ['issueStats'], {
        defaultWidth: 120,
        defaultHeight: 60,
    }),
    entry(
        'activity',
        'Recent Work Activity',
        ['activityLogs', 'users', 'issueTypes'],
        {
            defaultWidth: 80,
            defaultHeight: 170,
        },
    ),
    entry('projects', 'Projects Directory', ['projects'], {
        variants: ['cards', 'compact'],
        defaultHeight: 170,
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
