import { FC } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import { CompletionRatioCard } from '@/Components/Molecules/CompletionRatioCard/CompletionRatioCard';
import GreetingCard from '@/Components/Molecules/GreetingCard/GreetingCard';
import { PriorityBreakdownCard } from '@/Components/Molecules/PriorityBreakdownCard/PriorityBreakdownCard';
import { ProductivityTrendCard } from '@/Components/Molecules/ProductivityTrendCard/ProductivityTrendCard';
import ProjectsDirectoryPanel, {
    DEFAULT_PROJECTS_SHOWN,
} from '@/Components/Molecules/ProjectsDirectoryPanel/ProjectsDirectoryPanel';
import QuickActionsCard from '@/Components/Molecules/QuickActionsCard/QuickActionsCard';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import WeekSummaryCard from '@/Components/Molecules/WeekSummaryCard/WeekSummaryCard';
import ActivityFeedPanel from '@/Components/Organisms/ActivityFeedPanel/ActivityFeedPanel';
import DeadlinesCard from '@/Components/Organisms/DeadlinesCard/DeadlinesCard';
import MyIssuesCard from '@/Components/Organisms/MyIssuesCard/MyIssuesCard';
import { ActivityLogEntry } from '@/types/ActivityLog';
import {
    DashboardIssueRow,
    DashboardWidget as DashboardWidgetModel,
} from '@/types/Dashboard';
import {
    IssueStats,
    PaginatedResponse,
    ProductivityTrendProps,
} from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { toDashboardColor } from '@/utils/dashboardColors';
import { isOn, optionOf } from '@/utils/dashboardLayout';

/** What the dashboard page received; a prop is missing until a widget needs it. */
export interface DashboardData {
    issueStats?: IssueStats;
    projects: Project[];
    productivity_trend?: ProductivityTrendProps[];
    activityLogs?: PaginatedResponse<ActivityLogEntry>;
    users?: AssignableUser[];
    issueTypes?: IssueType[];
    queryParams?: Record<string, any> | null;
    myIssues?: DashboardIssueRow[];
    deadlines?: DashboardIssueRow[];
    /** The signed in user, from the shared page props. */
    auth?: { user?: { id: number; name: string } };
}

interface DashboardWidgetProps {
    widget: DashboardWidgetModel;
    data: DashboardData;
}

const percent = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

const STAT_VARIANTS = [
    'default',
    'vivid',
    'accent',
    'glass',
    'outline',
] as const;
const STAT_COLORS = ['accent', 'success', 'warning', 'error', 'info'] as const;

/** `known` when it is one of `options`, else the first of them. */
const pick = <T extends string>(
    options: readonly T[],
    value: string,
    fallback: T = options[0],
): T => options.find((option) => option === value) ?? fallback;

/** What the open issues statistic can count, with its title and hint. */
const OPEN_ISSUES_COUNTS = {
    open: { title: 'Open Issues', hint: 'Active tasks assigned/open' },
    todo: { title: 'To Do', hint: 'Issues waiting to be started' },
    in_progress: { title: 'In Progress', hint: 'Issues being worked on' },
    done: { title: 'Done Issues', hint: 'Issues that are finished' },
    all: { title: 'All Issues', hint: 'Every issue in your projects' },
} as const;

/** Stands in for a widget whose data is still on its way. */
const WidgetPlaceholder: FC = () => (
    <div
        data-testid="widget-placeholder"
        className="h-full min-h-28 animate-pulse rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)]"
    />
);

/** Draws one widget of the dashboard from the page data. */
const DashboardWidget: FC<DashboardWidgetProps> = ({ widget, data }) => {
    const { issueStats, projects } = data;
    const statProps = (
        defaultColor: (typeof STAT_COLORS)[number],
        hint: string,
    ) => ({
        className: 'h-full',
        variant: pick(STAT_VARIANTS, widget.variant, 'default'),
        color: pick(
            STAT_COLORS,
            optionOf(widget, 'color', defaultColor),
            defaultColor,
        ),
        showIcon: isOn(widget, 'icon'),
        description: isOn(widget, 'description') ? hint : undefined,
    });

    switch (widget.type) {
        case 'stat_projects':
            return (
                <StatCard
                    {...statProps('accent', 'Tracked projects in workspace')}
                    title="Active Projects"
                    value={<AnimatedNumber value={projects.length} />}
                    icon="FolderGit2"
                />
            );
        case 'stat_open_issues': {
            if (!issueStats) return <WidgetPlaceholder />;

            const count = pick(
                Object.keys(
                    OPEN_ISSUES_COUNTS,
                ) as (keyof typeof OPEN_ISSUES_COUNTS)[],
                optionOf(widget, 'count', 'open'),
            );
            const { category, total } = issueStats;
            const value = {
                open: total - category.done,
                todo: category.todo,
                in_progress: category.in_progress,
                done: category.done,
                all: total,
            }[count];

            return (
                <StatCard
                    {...statProps('info', OPEN_ISSUES_COUNTS[count].hint)}
                    title={OPEN_ISSUES_COUNTS[count].title}
                    value={<AnimatedNumber value={value} />}
                    icon="Layers"
                />
            );
        }
        case 'stat_critical':
            return issueStats ? (
                <StatCard
                    {...statProps(
                        'error',
                        'Issues at the top of their priority scale',
                    )}
                    title="Critical Tasks"
                    value={<AnimatedNumber value={issueStats.topPriority} />}
                    icon="TriangleAlert"
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'stat_resolution': {
            if (!issueStats) return <WidgetPlaceholder />;

            const rate = percent(issueStats.category.done, issueStats.total);

            return (
                <StatCard
                    {...statProps('success', 'Share of issues that are done')}
                    title="Resolution Rate"
                    value={
                        optionOf(widget, 'show', 'percent') === 'count' ? (
                            <>
                                <AnimatedNumber
                                    value={issueStats.category.done}
                                />
                                <span className="text-base font-semibold text-[var(--text-muted-color)]">
                                    {' '}
                                    / {issueStats.total}
                                </span>
                            </>
                        ) : (
                            <AnimatedNumber
                                value={rate}
                                format={(n) => `${Math.round(n)}%`}
                            />
                        )
                    }
                    icon="CircleCheck"
                    progress={rate}
                />
            );
        }
        case 'trend':
            return data.productivity_trend ? (
                <ProductivityTrendCard
                    trendData={data.productivity_trend}
                    className="h-full"
                    variant={widget.variant}
                    showHeader={isOn(widget, 'header')}
                    showGrid={isOn(widget, 'grid')}
                    values={
                        optionOf(widget, 'values', 'hover') === 'always'
                            ? 'always'
                            : 'hover'
                    }
                    highlightToday={isOn(widget, 'today')}
                    color={toDashboardColor(
                        optionOf(widget, 'color', 'accent'),
                    )}
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'completion':
            return issueStats ? (
                <CompletionRatioCard
                    todo={issueStats.category.todo}
                    inProgress={issueStats.category.in_progress}
                    done={issueStats.category.done}
                    total={issueStats.total}
                    donePct={percent(
                        issueStats.category.done,
                        issueStats.total,
                    )}
                    variant={widget.variant}
                    showHeader={isOn(widget, 'header')}
                    showTier={isOn(widget, 'tier')}
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'priority_breakdown':
            return issueStats ? (
                <PriorityBreakdownCard
                    priorities={issueStats.priority}
                    noPriority={issueStats.noPriority}
                    total={issueStats.total}
                    variant={widget.variant}
                    showHeader={isOn(widget, 'header')}
                    showNoPriority={isOn(widget, 'noPriority')}
                    showPercent={isOn(widget, 'percent')}
                    sort={
                        optionOf(widget, 'sort', 'priority') === 'count'
                            ? 'count'
                            : 'priority'
                    }
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'activity':
            return data.activityLogs ? (
                <ActivityFeedPanel
                    activityLogs={data.activityLogs}
                    users={data.users ?? []}
                    issueTypes={data.issueTypes ?? []}
                    queryParams={data.queryParams ?? {}}
                    compact={widget.variant === 'compact'}
                    showHeader={isOn(widget, 'header')}
                    showPagination={isOn(widget, 'pagination')}
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'projects':
            return (
                <ProjectsDirectoryPanel
                    projects={projects}
                    variant={widget.variant}
                    limit={Number(
                        widget.config.limit ?? DEFAULT_PROJECTS_SHOWN,
                    )}
                    sort={pick(
                        ['latest', 'name', 'progress', 'issues'] as const,
                        optionOf(widget, 'sort', 'latest'),
                    )}
                    showHeader={isOn(widget, 'header')}
                    showViewAll={isOn(widget, 'viewAll')}
                />
            );
        case 'stat_overdue':
            return issueStats ? (
                <StatCard
                    {...statProps('error', 'Open issues past their due date')}
                    title="Overdue Issues"
                    value={<AnimatedNumber value={issueStats.overdue} />}
                    icon="CalendarX"
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'stat_assigned':
            return issueStats ? (
                <StatCard
                    {...statProps('accent', 'Open issues assigned to you')}
                    title="Assigned to Me"
                    value={<AnimatedNumber value={issueStats.assigned} />}
                    icon="UserCheck"
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'stat_due_soon':
            return issueStats ? (
                <StatCard
                    {...statProps('warning', 'Open issues due within a week')}
                    title="Due Soon"
                    value={<AnimatedNumber value={issueStats.dueSoon} />}
                    icon="CalendarClock"
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'my_issues':
            return data.myIssues ? (
                <MyIssuesCard
                    issues={data.myIssues}
                    variant={widget.variant}
                    limit={Number(widget.config.limit ?? 5)}
                    sort={pick(
                        ['priority', 'due', 'updated'] as const,
                        optionOf(widget, 'sort', 'priority'),
                    )}
                    showHeader={isOn(widget, 'header')}
                    show={{
                        type: isOn(widget, 'type'),
                        project: isOn(widget, 'project'),
                        priority: isOn(widget, 'priority'),
                        due: isOn(widget, 'due'),
                    }}
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'deadlines':
            return data.deadlines ? (
                <DeadlinesCard
                    issues={data.deadlines}
                    variant={widget.variant}
                    scope={pick(
                        ['mine', 'all'] as const,
                        optionOf(widget, 'scope', 'mine'),
                    )}
                    userId={data.auth?.user?.id}
                    range={Number(widget.config.range ?? 14)}
                    overdue={isOn(widget, 'overdue')}
                    limit={Number(widget.config.limit ?? 10)}
                    showHeader={isOn(widget, 'header')}
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'types_breakdown':
            return issueStats ? (
                <PriorityBreakdownCard
                    priorities={issueStats.types.map((type, position) => ({
                        ...type,
                        position,
                    }))}
                    noPriority={0}
                    total={issueStats.total}
                    variant={widget.variant}
                    showHeader={isOn(widget, 'header')}
                    showPercent={isOn(widget, 'percent')}
                    sort={
                        optionOf(widget, 'sort', 'count') === 'name'
                            ? 'name'
                            : 'count'
                    }
                    title="Issue Types"
                    description="Issues distribution by type"
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'week_summary':
            return data.productivity_trend ? (
                <WeekSummaryCard
                    trend={data.productivity_trend}
                    variant={widget.variant}
                    showHeader={isOn(widget, 'header')}
                    showAverage={isOn(widget, 'average')}
                    showBest={isOn(widget, 'best')}
                    color={toDashboardColor(
                        optionOf(widget, 'color', 'accent'),
                    )}
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'quick_actions':
            return (
                <QuickActionsCard
                    variant={widget.variant}
                    showHeader={isOn(widget, 'header')}
                    showLabels={isOn(widget, 'labels')}
                    color={toDashboardColor(
                        optionOf(widget, 'color', 'accent'),
                    )}
                    enabled={{
                        newProject: isOn(widget, 'newProject'),
                        search: isOn(widget, 'search'),
                        projects: isOn(widget, 'projects'),
                        notifications: isOn(widget, 'notifications'),
                        editDashboard: isOn(widget, 'editDashboard'),
                        // Off unless it was turned on, unlike the others.
                        shortcuts:
                            optionOf(widget, 'shortcuts', 'off') === 'on',
                    }}
                />
            );
        case 'greeting':
            return issueStats ? (
                <GreetingCard
                    variant={widget.variant}
                    name={data.auth?.user?.name}
                    showName={isOn(widget, 'name')}
                    showDate={isOn(widget, 'date')}
                    showSummary={isOn(widget, 'summary')}
                    showIcon={isOn(widget, 'icon')}
                    color={toDashboardColor(
                        optionOf(widget, 'color', 'accent'),
                    )}
                    assigned={issueStats.assigned}
                    overdue={issueStats.overdue}
                    dueSoon={issueStats.dueSoon}
                />
            ) : (
                <WidgetPlaceholder />
            );
        default:
            return null;
    }
};

export default DashboardWidget;
