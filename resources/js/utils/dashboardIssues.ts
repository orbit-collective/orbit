import { DashboardIssueRow } from '@/types/Dashboard';
import { ProductivityTrendProps } from '@/types/Issues';
import { DueTone, daysUntil, dueInfo } from '@/utils/dueDate';
import { formatWeekdayDate } from '@/utils/time';

export type MyIssuesSort = 'priority' | 'due' | 'updated';

/** The position of a priority, or a number past every scale for none. */
const NO_PRIORITY = Number.MAX_SAFE_INTEGER;

const priorityOf = (row: DashboardIssueRow) =>
    row.priority?.position ?? NO_PRIORITY;

/** An end date as a number to sort by, issues without one last. */
const dueOf = (row: DashboardIssueRow) =>
    row.endDate ? Date.parse(row.endDate.slice(0, 10)) : NO_PRIORITY;

const updatedOf = (row: DashboardIssueRow) =>
    row.updatedAt ? Date.parse(row.updatedAt) : 0;

/** The rows ordered by a choice; ties keep the order they came in. */
export function sortIssues(
    rows: DashboardIssueRow[],
    sort: MyIssuesSort,
): DashboardIssueRow[] {
    const compare: Record<
        MyIssuesSort,
        (a: DashboardIssueRow, b: DashboardIssueRow) => number
    > = {
        priority: (a, b) =>
            priorityOf(a) - priorityOf(b) || dueOf(a) - dueOf(b),
        due: (a, b) => dueOf(a) - dueOf(b) || priorityOf(a) - priorityOf(b),
        updated: (a, b) => updatedOf(b) - updatedOf(a),
    };

    return [...rows].sort(compare[sort]);
}

export interface DeadlineFilter {
    /** `mine` keeps the issues assigned to the user. */
    scope: 'mine' | 'all';
    userId?: number;
    /** How many days ahead to look. */
    range: number;
    overdue: boolean;
    limit: number;
    now?: Date;
}

/** The deadlines a widget shows: filtered, nearest first, capped. */
export function filterDeadlines(
    rows: DashboardIssueRow[],
    { scope, userId, range, overdue, limit, now = new Date() }: DeadlineFilter,
): DashboardIssueRow[] {
    return rows
        .filter((row) => {
            if (!row.endDate) return false;
            if (scope === 'mine' && row.assigneeId !== userId) return false;

            const days = daysUntil(row.endDate, now);

            return days < 0 ? overdue : days <= range;
        })
        .slice(0, limit);
}

export interface WeekSummary {
    total: number;
    /** Issues updated per day with activity, rounded to one decimal. */
    average: number;
    best: { day: string; count: number } | null;
    /** What today has, when the week's data includes it. */
    today: number;
    days: ProductivityTrendProps[];
}

/** The numbers a week summary shows, from the trend of the week. */
export function summarizeWeek(
    trend: ProductivityTrendProps[],
    todayName: string = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
    }),
): WeekSummary {
    const total = trend.reduce((sum, day) => sum + day.count, 0);
    const best = trend.reduce<WeekSummary['best']>(
        (top, day) =>
            day.count > (top?.count ?? 0)
                ? { day: day.day, count: day.count }
                : top,
        null,
    );

    return {
        total,
        average:
            trend.length === 0
                ? 0
                : Math.round((total / trend.length) * 10) / 10,
        best,
        today: trend.find((day) => day.day === todayName)?.count ?? 0,
        days: trend,
    };
}

export interface DeadlineGroup {
    /** `overdue`, or the `YYYY-MM-DD` of the day. */
    key: string;
    label: string;
    tone: DueTone;
    rows: DashboardIssueRow[];
}

/**
 * The deadlines grouped for a timeline: everything overdue in one group
 * first, then a group per day, in order. The rows are expected nearest first.
 */
export function groupDeadlines(
    rows: DashboardIssueRow[],
    now: Date = new Date(),
): DeadlineGroup[] {
    const groups: DeadlineGroup[] = [];

    for (const row of rows) {
        if (!row.endDate) continue;

        const info = dueInfo(row.endDate, now);
        const key = info.days < 0 ? 'overdue' : row.endDate.slice(0, 10);
        let group = groups.find((item) => item.key === key);

        if (!group) {
            group = {
                key,
                tone: info.tone,
                label:
                    key === 'overdue'
                        ? 'Overdue'
                        : info.days === 0
                          ? 'Today'
                          : info.days === 1
                            ? 'Tomorrow'
                            : formatWeekdayDate(key).replace(/ \d{4}$/, ''),
                rows: [],
            };
            groups.push(group);
        }

        group.rows.push(row);
    }

    return groups;
}
