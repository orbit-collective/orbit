import { icons } from 'lucide-react';

export type DashboardWidgetType =
    | 'stat_projects'
    | 'stat_open_issues'
    | 'stat_critical'
    | 'stat_resolution'
    | 'trend'
    | 'completion'
    | 'priority_breakdown'
    | 'activity'
    | 'projects';

export type DashboardWidgetConfig = Record<string, string | number>;

/** One widget of the dashboard as saved in the user's layout. */
export interface DashboardWidget {
    id: string;
    type: DashboardWidgetType;
    variant: string;
    /** Width in twelfths of the dashboard. */
    span: number;
    visible: boolean;
    config: DashboardWidgetConfig;
}

export interface DashboardWidgetOption {
    key: string;
    label: string;
    options: (string | number)[];
    default: string | number;
}

/** What the server says a widget type can do (`DashboardWidgetType::catalog()`). */
export interface DashboardCatalogEntry {
    type: DashboardWidgetType;
    label: string;
    description: string;
    icon: keyof typeof icons;
    variants: string[];
    spans: number[];
    defaultSpan: number;
    options: DashboardWidgetOption[];
    /** Inertia props the widget draws from. */
    props: string[];
}

export interface DashboardLayoutProp {
    widgets: DashboardWidget[];
    catalog: DashboardCatalogEntry[];
}
