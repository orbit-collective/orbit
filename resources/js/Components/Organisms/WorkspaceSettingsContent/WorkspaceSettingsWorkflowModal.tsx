import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { WorkflowStatus, WorkflowStatusCategory } from '@/types/Workflow';
import { cn } from '@/utils/cn';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import { Fragment, ReactNode, useState } from 'react';

interface WorkspaceSettingsWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    issueType: IssueType | null;
    canUpdateWorkflow?: boolean;
}

const CATEGORY_OPTIONS: { value: WorkflowStatusCategory; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
];

const categoryLabel = (category: WorkflowStatusCategory) =>
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category;

const Chip = ({
    children,
    tone = 'muted',
}: {
    children: ReactNode;
    tone?: 'muted' | 'warning' | 'accent';
}) => (
    <span
        className={cn(
            'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
            tone === 'accent' &&
                'border-[var(--accent-color)] text-[var(--accent-color)]',
            tone === 'warning' &&
                'border-[var(--warning-color,#f59e0b)] text-[var(--warning-color,#f59e0b)]',
            tone === 'muted' &&
                'border-[var(--border-color)] text-[var(--text-gray-color)]',
        )}
    >
        {children}
    </span>
);

interface StatusCardProps {
    status: WorkflowStatus;
    index: number;
    outgoingCount: number;
    canUpdateWorkflow: boolean;
    onMakeInitial: (statusId: number) => void;
    onDelete: (statusId: number) => void;
}

/**
 * One step of the flow. Draggable and droppable at once so a card can be
 * dropped straight onto the position it should take over, which is the
 * whole reorder interaction - there is no separate drop zone to aim at.
 */
function StatusCard({
    status,
    index,
    outgoingCount,
    canUpdateWorkflow,
    onMakeInitial,
    onDelete,
}: StatusCardProps) {
    const draggable = useDraggable({
        id: status.id,
        disabled: !canUpdateWorkflow,
    });
    const droppable = useDroppable({ id: status.id });

    return (
        <div
            ref={(node) => {
                draggable.setNodeRef(node);
                droppable.setNodeRef(node);
            }}
            style={{
                transform: draggable.transform
                    ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
                    : undefined,
            }}
            className={cn(
                'flex items-center gap-3 rounded-xl border bg-[var(--surface-color)] px-3.5 py-3 transition-colors',
                draggable.isDragging
                    ? 'z-10 border-[var(--accent-color)] opacity-90 shadow-xl'
                    : 'border-[var(--border-color)]',
                droppable.isOver &&
                    !draggable.isDragging &&
                    'border-[var(--accent-color)]',
            )}
        >
            {canUpdateWorkflow && (
                <button
                    type="button"
                    aria-label={`Reorder ${status.name}`}
                    className="shrink-0 cursor-grab text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)] active:cursor-grabbing"
                    {...draggable.listeners}
                    {...draggable.attributes}
                >
                    <Icon name="GripVertical" size={14} />
                </button>
            )}

            <span className="w-5 shrink-0 text-center font-mono text-[11px] text-[var(--text-muted-color)]">
                {index + 1}
            </span>

            <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
            />

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-color)]">
                    {status.name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[var(--text-gray-color)]">
                        {categoryLabel(status.category)}
                    </span>
                    {status.isInitial && <Chip tone="accent">Start</Chip>}
                    {outgoingCount === 0 ? (
                        <Chip tone="warning">No transitions</Chip>
                    ) : (
                        <Chip>
                            {outgoingCount} transition
                            {outgoingCount === 1 ? '' : 's'}
                        </Chip>
                    )}
                </div>
            </div>

            {canUpdateWorkflow && (
                <div className="flex shrink-0 items-center gap-1">
                    {!status.isInitial && (
                        <button
                            type="button"
                            title="Make this the starting status"
                            aria-label={`Make ${status.name} the starting status`}
                            onClick={() => onMakeInitial(status.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--accent-color)]"
                        >
                            <Icon name="Flag" size={13} />
                        </button>
                    )}
                    <button
                        type="button"
                        title="Delete status"
                        aria-label={`Delete ${status.name}`}
                        onClick={() => onDelete(status.id)}
                        className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                    >
                        <Icon name="Trash" size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function WorkspaceSettingsWorkflowModal({
    isOpen,
    onClose,
    projectId,
    issueType,
    canUpdateWorkflow = false,
}: WorkspaceSettingsWorkflowModalProps) {
    const { addAlert } = useAlert();
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(LABEL_COLOR_PALETTE[0]);
    const [newCategory, setNewCategory] =
        useState<WorkflowStatusCategory>('todo');

    // A pointer has to travel a few pixels before a drag starts, so the
    // grip handle still delivers plain clicks to the buttons beside it.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    if (!issueType) return null;

    const statuses = issueType.statuses ?? [];
    const transitions = issueType.transitions ?? [];

    const transitionExists = (fromId: number, toId: number) =>
        transitions.some(
            (t) => t.fromStatusId === fromId && t.toStatusId === toId,
        );

    const outgoingCountFor = (statusId: number) =>
        transitions.filter((t) => t.fromStatusId === statusId).length;

    const handleAddStatus = () => {
        const name = newName.trim();
        if (!name) return;

        router.post(
            route('projects.issue-types.statuses.store', [
                projectId,
                issueType.id,
            ]),
            { name, color: newColor, category: newCategory },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setNewName(''),
                onError: () => addAlert('Could not add this status.', 'error'),
            },
        );
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const ids = statuses.map((status) => status.id);
        const from = ids.indexOf(Number(active.id));
        const to = ids.indexOf(Number(over.id));
        if (from === -1 || to === -1) return;

        ids.splice(to, 0, ids.splice(from, 1)[0]);

        router.patch(
            route('projects.issue-types.statuses.reorder', [
                projectId,
                issueType.id,
            ]),
            { status_ids: ids },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () =>
                    addAlert('Could not reorder the statuses.', 'error'),
            },
        );
    };

    const handleMakeInitial = (statusId: number) => {
        router.patch(
            route('projects.issue-types.statuses.initial', [
                projectId,
                issueType.id,
                statusId,
            ]),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onError: () =>
                    addAlert('Could not change the starting status.', 'error'),
            },
        );
    };

    const handleDeleteStatus = (statusId: number) => {
        router.delete(
            route('projects.issue-types.statuses.destroy', [
                projectId,
                issueType.id,
                statusId,
            ]),
            {
                preserveScroll: true,
                preserveState: true,
                onError: () =>
                    addAlert(
                        'Could not remove this status. Make sure no issues use it and at least one status remains.',
                        'error',
                    ),
            },
        );
    };

    const handleToggleTransition = (fromId: number, toId: number) => {
        if (fromId === toId) return;

        if (transitionExists(fromId, toId)) {
            const transition = transitions.find(
                (t) => t.fromStatusId === fromId && t.toStatusId === toId,
            );
            if (!transition) return;

            router.delete(
                route('projects.issue-types.transitions.destroy', [
                    projectId,
                    issueType.id,
                    transition.id,
                ]),
                { preserveScroll: true, preserveState: true },
            );
            return;
        }

        router.post(
            route('projects.issue-types.transitions.store', [
                projectId,
                issueType.id,
            ]),
            { from_status_id: fromId, to_status_id: toId },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalHeader
                title={`${issueType.name} workflow`}
                onClose={onClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon name="Workflow" size={16} />
                    </span>
                }
            />

            <div className="max-h-[75vh] space-y-8 overflow-y-auto px-6 py-6">
                <section className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--text-color)]">
                            Flow
                        </h4>
                        <p className="mt-0.5 text-xs text-[var(--text-gray-color)]">
                            {canUpdateWorkflow
                                ? 'The stages an issue of this type moves through. Drag a status to reorder the flow.'
                                : 'The stages an issue of this type moves through.'}
                        </p>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="space-y-1">
                            {statuses.map((status, index) => (
                                <Fragment key={status.id}>
                                    {index > 0 && (
                                        <div
                                            aria-hidden="true"
                                            className="flex justify-center py-0.5 text-[var(--text-muted-color)]"
                                        >
                                            <Icon
                                                name="ChevronDown"
                                                size={13}
                                            />
                                        </div>
                                    )}
                                    <StatusCard
                                        status={status}
                                        index={index}
                                        outgoingCount={outgoingCountFor(
                                            status.id,
                                        )}
                                        canUpdateWorkflow={canUpdateWorkflow}
                                        onMakeInitial={handleMakeInitial}
                                        onDelete={handleDeleteStatus}
                                    />
                                </Fragment>
                            ))}
                        </div>
                    </DndContext>

                    {canUpdateWorkflow && (
                        <div className="space-y-3 rounded-xl border border-dashed border-[var(--border-color)] p-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="New status name"
                                    variant="modal"
                                    className="max-w-[180px]"
                                />
                                <div data-testid="new-status-category">
                                    <InlineSelectDropdown
                                        label="Category"
                                        placeholder="Category"
                                        options={CATEGORY_OPTIONS}
                                        value={newCategory}
                                        onChange={(value) =>
                                            value &&
                                            setNewCategory(
                                                value as WorkflowStatusCategory,
                                            )
                                        }
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddStatus}
                                    disabled={!newName.trim()}
                                    className="ml-auto rounded-md bg-[var(--accent-color)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Add status
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {LABEL_COLOR_PALETTE.slice(0, 10).map(
                                    (swatch) => (
                                        <button
                                            key={swatch}
                                            type="button"
                                            onClick={() => setNewColor(swatch)}
                                            aria-label={`Use color ${swatch}`}
                                            className={cn(
                                                'h-5 w-5 shrink-0 rounded-full border transition-transform',
                                                newColor === swatch
                                                    ? 'scale-110 border-white'
                                                    : 'border-transparent hover:scale-110',
                                            )}
                                            style={{
                                                backgroundColor: swatch,
                                            }}
                                        />
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--text-color)]">
                            Transitions
                        </h4>
                        <p className="mt-0.5 text-xs text-[var(--text-gray-color)]">
                            For each status, pick which other statuses an issue
                            may move directly to from there.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {statuses.map((from) => (
                            <div
                                key={from.id}
                                className="rounded-xl border border-[var(--border-color)] p-3.5"
                            >
                                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-gray-color)]">
                                        From
                                    </span>
                                    <WorkflowStatusBadge status={from} />
                                    {outgoingCountFor(from.id) === 0 && (
                                        <Chip tone="warning">
                                            No transitions
                                        </Chip>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {statuses
                                        .filter((to) => to.id !== from.id)
                                        .map((to) => {
                                            const isAllowed = transitionExists(
                                                from.id,
                                                to.id,
                                            );
                                            return (
                                                <button
                                                    key={to.id}
                                                    type="button"
                                                    disabled={
                                                        !canUpdateWorkflow
                                                    }
                                                    aria-pressed={isAllowed}
                                                    aria-label={`Allow transition from ${from.name} to ${to.name}`}
                                                    onClick={() =>
                                                        handleToggleTransition(
                                                            from.id,
                                                            to.id,
                                                        )
                                                    }
                                                    className={cn(
                                                        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed',
                                                        isAllowed
                                                            ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)] text-[var(--accent-color)]'
                                                            : 'border-[var(--border-color)] bg-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)]',
                                                    )}
                                                >
                                                    <Icon
                                                        name={
                                                            isAllowed
                                                                ? 'Check'
                                                                : 'ArrowRight'
                                                        }
                                                        size={11}
                                                    />
                                                    {to.name}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Modal>
    );
}
