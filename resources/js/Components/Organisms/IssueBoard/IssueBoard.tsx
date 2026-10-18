import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    DropAnimation,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import BoardColumn from '@/Components/Molecules/BoardColumn/BoardColumn';
import { BoardCardOverlay } from '@/Components/Organisms/BoardCard/BoardCard';
import { useAlert } from '@/context/AlertContext';
import { useProjectPriorities } from '@/context/ProjectPrioritiesContext';
import {
    BoardColumnMeta,
    BoardGroupBy,
    IssueBoardProps,
} from '@/types/Components';
import { Issue } from '@/types/Issues';
import { PriorityDetails } from '@/types/Priorities';
import { cn } from '@/utils/cn';
import { resolvePriorityIcon } from '@/utils/priorityIcons';
import { formatStatusLabel } from '@/utils/text';
import {
    getReachableStatuses,
    isIssueDone,
    issueCategory,
} from '@/utils/workflow';

const dropAnimationConfig: DropAnimation = {
    duration: 220,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

const NO_PRIORITY_COLUMN_ID = 'priority-none';

const priorityColumnId = (priorityId: number | null | undefined) =>
    priorityId == null ? NO_PRIORITY_COLUMN_ID : `priority-${priorityId}`;

/**
 * One column per priority of the project's scale, most important first, plus
 * a "No priority" column at the end so an issue can be put back to none.
 */
const buildPriorityColumns = (
    priorities: PriorityDetails[],
): BoardColumnMeta[] => [
    ...priorities.map((priority): BoardColumnMeta => ({
        id: priorityColumnId(priority.id),
        label: priority.name,
        hint: '',
        accent: priority.color,
        icon: resolvePriorityIcon(priority.icon),
    })),
    {
        id: NO_PRIORITY_COLUMN_ID,
        label: 'No priority',
        hint: 'Not prioritised yet',
        accent: '#757575',
        icon: 'CircleDashed',
    },
];

const STATUS_COLUMNS: BoardColumnMeta[] = [
    {
        id: 'todo',
        label: 'To Do',
        hint: 'Not started yet',
        accent: 'var(--info-color)',
        icon: 'GitPullRequest',
    },
    {
        id: 'in_progress',
        label: 'In Progress',
        hint: 'Being worked on',
        accent: 'var(--accent-color)',
        icon: 'CircleDashed',
    },
    {
        id: 'done',
        label: 'Done',
        hint: 'Completed',
        accent: 'var(--pending-color)',
        icon: 'CircleCheck',
    },
];

const GROUP_BY_OPTIONS: { value: BoardGroupBy; label: string }[] = [
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
];

function IssueBoard({ issues }: IssueBoardProps) {
    const { addAlert } = useAlert();
    const [boardIssues, setBoardIssues] = useState<Issue[]>(issues);
    const [draggingIssue, setDraggingIssue] = useState<Issue | null>(null);
    const [groupBy, setGroupBy] = useState<BoardGroupBy>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('boardGroupBy');
            if (saved === 'priority' || saved === 'status') {
                return saved;
            }
        }
        return 'priority';
    });

    useEffect(() => {
        setBoardIssues(issues);
    }, [issues]);

    useEffect(() => {
        localStorage.setItem('boardGroupBy', groupBy);
    }, [groupBy]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    // Without a provider (the board outside a project page) the columns come
    // from the priorities the issues themselves carry.
    const { priorities } = useProjectPriorities();
    const scale: PriorityDetails[] =
        priorities.length > 0
            ? priorities
            : [
                  ...new Map(
                      boardIssues
                          .filter((issue) => issue.priorityDetails)
                          .map((issue) => [
                              issue.priorityDetails!.id,
                              issue.priorityDetails!,
                          ]),
                  ).values(),
              ].sort((a, b) => a.position - b.position);

    const columns =
        groupBy === 'priority' ? buildPriorityColumns(scale) : STATUS_COLUMNS;

    const groupIssues = (issues: Issue[]) => {
        const board: Record<string, Issue[]> = {};
        columns.forEach((column) => {
            board[column.id] = [];
        });

        issues.forEach((issue) => {
            const key =
                groupBy === 'priority'
                    ? priorityColumnId(issue.priority_id)
                    : issueCategory(issue);
            if (board[key]) {
                board[key].push(issue);
            }
        });

        return board;
    };

    const grouped = groupIssues(boardIssues);

    // In priority mode, the count only reflects still-active work — done
    // issues no longer need attention at that priority. In status mode every
    // issue in a column already IS that category, so the total is the count.
    const countFor = (columnIssues: Issue[]) =>
        groupBy === 'priority'
            ? columnIssues.filter((issue) => !isIssueDone(issue)).length
            : columnIssues.length;

    const handleDragStart = (event: DragStartEvent) => {
        const issue = boardIssues.find((i) => i.id === event.active.id);
        setDraggingIssue(issue ?? null);
    };

    const moveIssue = (
        issue: Issue,
        optimistic: Partial<Issue>,
        previous: Partial<Issue>,
        payload: Record<string, string | number | null>,
        label: string,
    ) => {
        setBoardIssues((prev) =>
            prev.map((i) => (i.id === issue.id ? { ...i, ...optimistic } : i)),
        );

        router.patch(route('issues.update', issue.id), payload, {
            preserveScroll: true,
            preserveState: true,
            onError: () => {
                setBoardIssues((prev) =>
                    prev.map((i) =>
                        i.id === issue.id ? { ...i, ...previous } : i,
                    ),
                );
                addAlert(`Failed to update issue ${label}`, 'error');
            },
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingIssue(null);

        if (!over) return;

        const issue = boardIssues.find((i) => i.id === active.id);
        if (!issue) return;

        const targetValue = String(over.id);

        if (groupBy === 'priority') {
            if (priorityColumnId(issue.priority_id) === targetValue) return;

            const target =
                targetValue === NO_PRIORITY_COLUMN_ID
                    ? null
                    : (scale.find(
                          (priority) =>
                              priorityColumnId(priority.id) === targetValue,
                      ) ?? null);

            if (target === null && targetValue !== NO_PRIORITY_COLUMN_ID) {
                return;
            }

            moveIssue(
                issue,
                {
                    priority: target?.name ?? null,
                    priority_id: target?.id ?? null,
                    priorityDetails: target,
                },
                {
                    priority: issue.priority,
                    priority_id: issue.priority_id,
                    priorityDetails: issue.priorityDetails,
                },
                { priority: target?.name ?? null },
                'priority',
            );
            return;
        }

        if (issueCategory(issue) === targetValue) return;

        // A column is a category; the issue type decides which of its own
        // statuses stands for it, and only one the workflow lets the issue
        // move to right now can be used.
        const target = getReachableStatuses(issue).find(
            (status) => status.category === targetValue,
        );

        if (!target) {
            addAlert(
                `This issue type has no reachable ${formatStatusLabel(targetValue)} status`,
                'error',
            );
            return;
        }

        moveIssue(
            issue,
            { workflowStatus: target, workflow_status_id: target.id },
            {
                workflowStatus: issue.workflowStatus,
                workflow_status_id: issue.workflow_status_id,
            },
            { workflow_status_id: target.id },
            'status',
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full flex-col">
                <div className="flex items-center px-4 pt-4 md:px-6 md:pt-6">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] p-1">
                        {GROUP_BY_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setGroupBy(option.value)}
                                className={cn(
                                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                    groupBy === option.value
                                        ? 'bg-[var(--bg-light-color-hover)] text-[var(--text-color)]'
                                        : 'text-[var(--text-muted-color)] hover:text-[var(--text-gray-color)]',
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto p-4 md:gap-5 md:p-6">
                    {columns.map((column) => {
                        const columnIssues = grouped[column.id];
                        return (
                            <BoardColumn
                                key={column.id}
                                issues={columnIssues}
                                meta={column}
                                count={countFor(columnIssues)}
                            />
                        );
                    })}
                </div>
            </div>
            <DragOverlay dropAnimation={dropAnimationConfig}>
                {draggingIssue ? (
                    <BoardCardOverlay
                        issue={draggingIssue}
                        isClosed={isIssueDone(draggingIssue)}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export default IssueBoard;
