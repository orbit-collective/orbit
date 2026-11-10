import { icons } from 'lucide-react';
import { IssueStats } from '@/types/Issues';
import { DashboardColor } from '@/utils/dashboardColors';

type StatMetric =
    | 'projects'
    | 'open_issues'
    | 'critical'
    | 'resolution'
    | 'overdue'
    | 'assigned'
    | 'due_soon';

type StatCount = 'open' | 'todo' | 'in_progress' | 'done' | 'all';

const STAT_METRICS: StatMetric[] = [
    'projects',
    'open_issues',
    'critical',
    'resolution',
    'overdue',
    'assigned',
    'due_soon',
];

const STAT_COUNTS: StatCount[] = ['open', 'todo', 'in_progress', 'done', 'all'];

/** What the open issues statistic can count, with its title and hint. */
const COUNTS = {
    open: { title: 'Open Issues', hint: 'Active tasks assigned/open' },
    todo: { title: 'To Do', hint: 'Issues waiting to be started' },
    in_progress: { title: 'In Progress', hint: 'Issues being worked on' },
    done: { title: 'Done Issues', hint: 'Issues that are finished' },
    all: { title: 'All Issues', hint: 'Every issue in your projects' },
} as const;

/** What a metric is called, which icon and color it has unless told otherwise. */
const METRICS: Record<
    Exclude<StatMetric, 'open_issues'>,
    {
        title: string;
        hint: string;
        icon: keyof typeof icons;
        color: DashboardColor;
    }
> & { open_issues: { icon: keyof typeof icons; color: DashboardColor } } = {
    projects: {
        title: 'Active Projects',
        hint: 'Tracked projects in workspace',
        icon: 'FolderGit2',
        color: 'accent',
    },
    open_issues: { icon: 'Layers', color: 'info' },
    critical: {
        title: 'Critical Tasks',
        hint: 'Issues at the top of their priority scale',
        icon: 'TriangleExclamationPoint',
        color: 'error',
    },
    resolution: {
        title: 'Resolution Rate',
        hint: 'Share of issues that are done',
        icon: 'CircleCheck',
        color: 'success',
    },
    overdue: {
        title: 'Overdue Issues',
        hint: 'Open issues past their due date',
        icon: 'CalendarX',
        color: 'error',
    },
    assigned: {
        title: 'Assigned to Me',
        hint: 'Open issues assigned to you',
        icon: 'UserCheck',
        color: 'accent',
    },
    due_soon: {
        title: 'Due Soon',
        hint: 'Open issues due within a week',
        icon: 'CalendarClock',
        color: 'warning',
    },
};

export interface StatFigures {
    title: string;
    hint: string;
    icon: keyof typeof icons;
    /** The color the metric takes when the widget's color is "automatic". */
    color: DashboardColor;
    value: number;
    /** What the value is a part of, or null when it is not a part of anything. */
    whole: number | null;
}

/** `value` when it is one of `options`, else `fallback`. */
const oneOf = <T extends string>(
    options: readonly T[],
    value: unknown,
    fallback: T,
): T => options.find((option) => option === value) ?? fallback;

/** The title of a metric as the editor and the grid name it. */
export const statTitle = (metric: unknown): string => {
    const known = oneOf(STAT_METRICS, metric, 'open_issues');

    return known === 'open_issues' ? COUNTS.open.title : METRICS[known].title;
};

/**
 * The number a statistic widget shows and what it says about it. Issue
 * metrics are a part of every issue, or of the open ones for the metrics
 * about what is still to do.
 */
export const statFigures = (
    metricValue: unknown,
    countValue: unknown,
    stats: IssueStats,
    projectCount: number,
): StatFigures => {
    const metric = oneOf(STAT_METRICS, metricValue, 'open_issues');
    const { category, total } = stats;
    const open = total - category.done;

    switch (metric) {
        case 'projects':
            return { ...METRICS.projects, value: projectCount, whole: null };
        case 'open_issues': {
            const count = oneOf(STAT_COUNTS, countValue, 'open');
            const value = {
                open,
                todo: category.todo,
                in_progress: category.in_progress,
                done: category.done,
                all: total,
            }[count];

            return {
                ...METRICS.open_issues,
                title: COUNTS[count].title,
                hint: COUNTS[count].hint,
                value,
                whole: total,
            };
        }
        case 'critical':
            return {
                ...METRICS.critical,
                value: stats.topPriority,
                whole: total,
            };
        case 'resolution':
            return {
                ...METRICS.resolution,
                value: category.done,
                whole: total,
            };
        case 'overdue':
            return { ...METRICS.overdue, value: stats.overdue, whole: open };
        case 'assigned':
            return {
                ...METRICS.assigned,
                value: stats.assigned,
                whole: open,
            };
        case 'due_soon':
            return { ...METRICS.due_soon, value: stats.dueSoon, whole: open };
    }
};
