import BoardColumn from '@/Components/Molecules/BoardColumn/BoardColumn';
import { BoardCardOverlay } from '@/Components/Organisms/BoardCard/BoardCard';
import { useAlert } from '@/context/AlertContext';
import {
    BoardColumnMeta,
    BoardGroupBy,
    IssueBoardProps,
} from '@/types/Components';
import { Issue } from '@/types/Issues';
import { cn } from '@/utils/cn';
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

const dropAnimationConfig: DropAnimation = {
    duration: 220,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

const PRIORITY_COLUMNS: BoardColumnMeta[] = [
    {
        id: 'high',
        label: 'High Priority',
        hint: 'Fix immediately',
        accent: 'var(--error-color)',
        icon: 'Flame',
    },
    {
        id: 'medium',
        label: 'Medium Priority',
        hint: 'Handle soon',
        accent: 'var(--warning-color)',
        icon: 'Gauge',
    },
    {
        id: 'low',
        label: 'Low Priority',
        hint: 'When time allows',
        accent: 'var(--success-color)',
        icon: 'Leaf',
    },
];

const STATUS_COLUMNS: BoardColumnMeta[] = [
    {
        id: 'open',
        label: 'Open',
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
        id: 'closed',
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

    const columns = groupBy === 'priority' ? PRIORITY_COLUMNS : STATUS_COLUMNS;

    const groupIssues = (issues: Issue[]) => {
        const board: Record<string, Issue[]> = {};
        columns.forEach((column) => {
            board[column.id] = [];
        });

        issues.forEach((issue) => {
            const key = issue[groupBy];
            if (board[key]) {
                board[key].push(issue);
            }
        });

        return board;
    };

    const grouped = groupIssues(boardIssues);

    // In priority mode, the count only reflects still-active work — closed
    // issues no longer need attention at that priority. In status mode every
    // issue in a column already IS that status, so the total is the count.
    const countFor = (columnIssues: Issue[]) =>
        groupBy === 'priority'
            ? columnIssues.filter((issue) => issue.status !== 'closed').length
            : columnIssues.length;

    const handleDragStart = (event: DragStartEvent) => {
        const issue = boardIssues.find((i) => i.id === event.active.id);
        setDraggingIssue(issue ?? null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingIssue(null);

        if (!over) return;

        const targetValue = over.id as Issue['priority'] | Issue['status'];
        const issue = boardIssues.find((i) => i.id === active.id);
        if (!issue || issue[groupBy] === targetValue) return;

        const previousValue = issue[groupBy];

        setBoardIssues((prev) =>
            prev.map((i) =>
                i.id === issue.id ? { ...i, [groupBy]: targetValue } : i,
            ),
        );

        router.patch(
            route('issues.update', issue.id),
            { [groupBy]: targetValue },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    setBoardIssues((prev) =>
                        prev.map((i) =>
                            i.id === issue.id
                                ? { ...i, [groupBy]: previousValue }
                                : i,
                        ),
                    );
                    addAlert(`Failed to update issue ${groupBy}`, 'error');
                },
            },
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full flex-col bg-[var(--bg-color)]">
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
                        isClosed={draggingIssue.status === 'closed'}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export default IssueBoard;
