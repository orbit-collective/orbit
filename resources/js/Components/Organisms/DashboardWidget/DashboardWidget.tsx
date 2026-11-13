import { useLaravelReactI18n } from 'laravel-react-i18n';
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
import { statFigures } from '@/utils/dashboardStat';

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

/** What a statistic reads while the stats are on their way and it needs none. */
const EMPTY_STATS: IssueStats = {
    total: 0,
    priority: [],
    noPriority: 0,
    topPriority: 0,
    category: { todo: 0, in_progress: 0, done: 0 },
    overdue: 0,
    dueSoon: 0,
    assigned: 0,
    types: [],
};

/** Stands in for a widget whose data is still on its way. */
const WidgetPlaceholder: FC = () => (
    <div
        data-testid="widget-placeholder"
        className="h-full min-h-28 animate-pulse rounded-xl border border-solid border-(--border-color) bg-(--surface-color)"
    />
);

/** Draws one widget of the dashboard from the page data. */
const DashboardWidget: FC<DashboardWidgetProps> = ({ widget, data }) => {
    const { t } = useLaravelReactI18n();
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
        case 'stat': {
            const metric = optionOf(widget, 'metric', 'open_issues');

            if (!issueStats && metric !== 'projects') {
                return <WidgetPlaceholder />;
            }

            const figures = statFigures(
                metric,
                optionOf(widget, 'count', 'open'),
                issueStats ?? EMPTY_STATS,
                projects.length,
                t,
            );
            // "Automatic" is not one of the colors, so the metric's own stands.
            const props = statProps(figures.color, figures.hint);
            const show =
                figures.whole === null
                    ? 'value'
                    : pick(
                          ['value', 'fraction', 'percent'] as const,
                          optionOf(widget, 'show', 'value'),
                      );
            const rate =
                figures.whole === null
                    ? 0
                    : percent(figures.value, figures.whole);

            return (
                <StatCard
                    {...props}
                    title={figures.title}
                    value={
                        show === 'fraction' ? (
                            <>
                                <AnimatedNumber value={figures.value} />
                                <span className="text-base font-semibold text-(--text-muted-color)">
                                    {' '}
                                    / {figures.whole}
                                </span>
                            </>
                        ) : show === 'percent' ? (
                            <AnimatedNumber
                                value={rate}
                                format={(n) => `${Math.round(n)}%`}
                            />
                        ) : (
                            <AnimatedNumber value={figures.value} />
                        )
                    }
                    icon={figures.icon}
                    progress={show === 'value' ? undefined : rate}
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
                    title={t('dashboard_widget.issue_types.title')}
                    description={t('dashboard_widget.issue_types.description')}
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
