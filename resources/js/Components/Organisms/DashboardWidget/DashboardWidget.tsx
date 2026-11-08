import { FC } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import ActivityFeedPanel from '@/Components/Molecules/ActivityFeedPanel/ActivityFeedPanel';
import { CompletionRatioCard } from '@/Components/Molecules/CompletionRatioCard/CompletionRatioCard';
import { PriorityBreakdownCard } from '@/Components/Molecules/PriorityBreakdownCard/PriorityBreakdownCard';
import { ProductivityTrendCard } from '@/Components/Molecules/ProductivityTrendCard/ProductivityTrendCard';
import ProjectsDirectoryPanel, {
    DEFAULT_PROJECTS_SHOWN,
} from '@/Components/Molecules/ProjectsDirectoryPanel/ProjectsDirectoryPanel';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { ActivityLogEntry } from '@/types/ActivityLog';
import { DashboardWidget as DashboardWidgetModel } from '@/types/Dashboard';
import {
    IssueStats,
    PaginatedResponse,
    ProductivityTrendProps,
} from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';

/** What the dashboard page received; a prop is missing until a widget needs it. */
export interface DashboardData {
    issueStats?: IssueStats;
    projects: Project[];
    productivity_trend?: ProductivityTrendProps[];
    activityLogs?: PaginatedResponse<ActivityLogEntry>;
    users?: AssignableUser[];
    issueTypes?: IssueType[];
    queryParams?: Record<string, any> | null;
}

interface DashboardWidgetProps {
    widget: DashboardWidgetModel;
    data: DashboardData;
}

const percent = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

const STAT_VARIANTS = ['default', 'vivid', 'accent'] as const;

const statVariant = (variant: string) =>
    STAT_VARIANTS.find((known) => known === variant) ?? 'default';

/** Stands in for a widget whose data is still on its way. */
export const WidgetPlaceholder: FC = () => (
    <div
        data-testid="widget-placeholder"
        className="h-full min-h-28 animate-pulse rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)]"
    />
);

/** Draws one widget of the dashboard from the page data. */
const DashboardWidget: FC<DashboardWidgetProps> = ({ widget, data }) => {
    const { issueStats, projects } = data;
    const variant = statVariant(widget.variant);

    switch (widget.type) {
        case 'stat_projects':
            return (
                <StatCard
                    className="h-full"
                    variant={variant}
                    title="Active Projects"
                    value={<AnimatedNumber value={projects.length} />}
                    icon="FolderGit2"
                    description="Tracked projects in workspace"
                    color="accent"
                />
            );
        case 'stat_open_issues':
            return issueStats ? (
                <StatCard
                    className="h-full"
                    variant={variant}
                    title="Open Issues"
                    value={
                        <AnimatedNumber
                            value={issueStats.total - issueStats.category.done}
                        />
                    }
                    icon="Layers"
                    description="Active tasks assigned/open"
                    color="info"
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'stat_critical':
            return issueStats ? (
                <StatCard
                    className="h-full"
                    variant={variant}
                    title="Critical Tasks"
                    value={<AnimatedNumber value={issueStats.topPriority} />}
                    icon="TriangleAlert"
                    description="Issues at the top of their priority scale"
                    color="error"
                />
            ) : (
                <WidgetPlaceholder />
            );
        case 'stat_resolution': {
            if (!issueStats) return <WidgetPlaceholder />;

            const rate = percent(issueStats.category.done, issueStats.total);

            return (
                <StatCard
                    className="h-full"
                    variant={variant}
                    title="Resolution Rate"
                    value={
                        <AnimatedNumber
                            value={rate}
                            format={(n) => `${Math.round(n)}%`}
                        />
                    }
                    icon="CircleCheck"
                    progress={rate}
                    color="success"
                />
            );
        }
        case 'trend':
            return data.productivity_trend ? (
                <ProductivityTrendCard
                    trendData={data.productivity_trend}
                    className="h-full"
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
                />
            );
        default:
            return null;
    }
};

export default DashboardWidget;
