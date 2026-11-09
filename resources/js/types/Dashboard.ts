import { icons } from 'lucide-react';

export type DashboardWidgetType =
    | 'stat'
    | 'trend'
    | 'completion'
    | 'priority_breakdown'
    | 'activity'
    | 'projects'
    | 'my_issues'
    | 'deadlines'
    | 'types_breakdown'
    | 'week_summary'
    | 'quick_actions'
    | 'greeting';

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
    /** How a value is called in the editor, when it is not the value itself. */
    labels?: Record<string, string>;
    /** `color` when the choice is one of the dashboard colors, shown as swatches. */
    kind?: 'color';
    /** The option is shown only while the widget's other options have these values. */
    when?: Record<string, string[]>;
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

/** A layout the user kept under a name. */
export interface DashboardSavedLayout {
    id: number;
    name: string;
    widgets: DashboardWidget[];
}

/** One issue as the dashboard's lists show it (`IssueService::dashboardRow()`). */
export interface DashboardIssueRow {
    id: number;
    number: number;
    title: string;
    projectId: number;
    projectName: string | null;
    projectColor: string | null;
    type: { name: string; icon: string; color: string } | null;
    priority: {
        id: number;
        name: string;
        color: string;
        icon: string;
        position: number;
    } | null;
    status: { name: string; category: 'todo' | 'in_progress' | 'done' } | null;
    assigneeId: number | null;
    /** `YYYY-MM-DD`, or null. */
    endDate: string | null;
    updatedAt: string | null;
}
