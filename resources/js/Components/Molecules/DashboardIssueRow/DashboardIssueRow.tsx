import { Link } from '@inertiajs/react';
import type { icons } from 'lucide-react';
import { FC } from 'react';
import DueChip from '@/Components/Atoms/DueChip/DueChip';
import Icon from '@/Components/Atoms/Icon/Icon';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import { DashboardIssueRow as Row } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import { dueInfo } from '@/utils/dueDate';
import { FOCUS_RING_INSET } from '@/utils/focusRing';

export interface DashboardIssueRowShow {
    type: boolean;
    project: boolean;
    priority: boolean;
    due: boolean;
}

interface DashboardIssueRowProps {
    issue: Row;
    /** `row` is one line with its parts, `compact` a tighter one, `card` a tile. */
    density?: 'row' | 'compact' | 'card';
    show?: Partial<DashboardIssueRowShow>;
    /** A narrow box drops the project and puts the due date under the title. */
    narrow?: boolean;
    now?: Date;
}

const ALL: DashboardIssueRowShow = {
    type: true,
    project: true,
    priority: true,
    due: true,
};

/**
 * One issue in a list of the dashboard: its type, number and title, and
 * optionally its project, priority and due date. The whole row is the link to
 * the issue and its name says all of it, so it reads well aloud.
 */
const DashboardIssueRow: FC<DashboardIssueRowProps> = ({
    issue,
    density = 'row',
    show,
    narrow = false,
    now,
}) => {
    const parts = { ...ALL, ...show };
    const isCard = density === 'card';
    const theme = issue.projectColor
        ? getColorTheme(issue.projectColor as never)
        : null;
    const dueDate = parts.due ? issue.endDate : null;
    const hasPriority = parts.priority && issue.priority;
    // A narrow row puts the due date under the title and drops the project.
    const showProject = parts.project && issue.projectName && !narrow;
    const dueUnder = !isCard && narrow && dueDate;
    const trailing =
        !isCard && (showProject || hasPriority || (dueDate && !dueUnder));

    const label = [
        `#${issue.number} ${issue.title}`,
        parts.project && issue.projectName ? `in ${issue.projectName}` : null,
        hasPriority ? `${issue.priority!.name} priority` : null,
        dueDate ? dueInfo(dueDate, now).spoken : null,
    ]
        .filter(Boolean)
        .join(', ');

    const projectDot = theme && (
        <span
            aria-hidden="true"
            className={cn('h-1.5 w-1.5 shrink-0 rounded-xs', theme.accent)}
        />
    );

    return (
        <Link
            href={`/projects/${issue.projectId}/issues/${issue.id}`}
            aria-label={label}
            className={cn(
                'group flex min-w-0 no-underline transition-colors',
                FOCUS_RING_INSET,
                isCard
                    ? 'flex-col gap-2 rounded-xl border border-solid border-(--border-color) bg-(--bg-color-hover) p-3 hover:border-(--border-color-strong) hover:bg-(--bg-light-color-hover)'
                    : 'items-center gap-2.5 rounded-lg px-2 hover:bg-(--bg-light-color)',
                density === 'row' && 'min-h-10 py-1.5',
                density === 'compact' && 'min-h-8 py-1',
            )}
        >
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
                {parts.type && issue.type && (
                    <Icon
                        name={issue.type.icon as keyof typeof icons}
                        size={density === 'compact' ? 13 : 15}
                        color={issue.type.color}
                        className="shrink-0"
                    />
                )}
                <span className="shrink-0 text-[11px] font-medium text-(--text-muted-color) tabular-nums">
                    #{issue.number}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span
                        className={cn(
                            'text-(--text-color)',
                            isCard
                                ? 'line-clamp-2 text-sm font-medium'
                                : 'truncate text-sm',
                        )}
                    >
                        {issue.title}
                    </span>
                    {dueUnder && (
                        <span className="mt-0.5">
                            <DueChip endDate={dueDate} now={now} />
                        </span>
                    )}
                </span>
            </span>

            {trailing && (
                <span className="flex shrink-0 items-center gap-2">
                    {showProject && (
                        <span className="hidden max-w-28 items-center gap-1.5 text-[11px] text-(--text-muted-color) sm:inline-flex">
                            {projectDot}
                            <span className="truncate">
                                {issue.projectName}
                            </span>
                        </span>
                    )}
                    {hasPriority && (
                        <PriorityIcon
                            priority={issue.priority}
                            tooltip={false}
                        />
                    )}
                    {dueDate && !dueUnder && (
                        <DueChip endDate={dueDate} now={now} />
                    )}
                </span>
            )}

            {isCard && (parts.project || hasPriority || dueDate) && (
                <span className="flex items-center justify-between gap-2 text-[11px] text-(--text-muted-color)">
                    <span className="flex min-w-0 items-center gap-1.5">
                        {parts.project && issue.projectName && (
                            <>
                                {projectDot}
                                <span className="truncate">
                                    {issue.projectName}
                                </span>
                            </>
                        )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                        {hasPriority && (
                            <PriorityIcon
                                priority={issue.priority}
                                tooltip={false}
                            />
                        )}
                        {dueDate && <DueChip endDate={dueDate} now={now} />}
                    </span>
                </span>
            )}
        </Link>
    );
};

export default DashboardIssueRow;
