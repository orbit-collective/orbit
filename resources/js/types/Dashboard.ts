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
export type DashboardWidget = {
    id: string;
    type: DashboardWidgetType;
    variant: string;
    /** Width, in 120ths of the dashboard's width. */
    width: number;
    /** Height, in rows of `ROW_HEIGHT` pixels. */
    height: number;
    visible: boolean;
    config: DashboardWidgetConfig;
};

interface DashboardWidgetOption {
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
    minWidth: number;
    defaultWidth: number;
    minHeight: number;
    defaultHeight: number;
    options: DashboardWidgetOption[];
    /** Inertia props the widget draws from. */
    props: string[];
}

export interface DashboardLayoutProp {
    widgets: DashboardWidget[];
    catalog: DashboardCatalogEntry[];
}
