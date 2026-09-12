import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { WorkflowStatusCategory } from '@/types/Workflow';
import { cn } from '@/utils/cn';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';
import { router } from '@inertiajs/react';
import { useState } from 'react';

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

    if (!issueType) return null;

    const statuses = issueType.statuses ?? [];
    const transitions = issueType.transitions ?? [];

    const transitionExists = (fromId: number, toId: number) =>
        transitions.some(
            (t) => t.fromStatusId === fromId && t.toStatusId === toId,
        );

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
                            Statuses
                        </h4>
                        <p className="mt-0.5 text-xs text-[var(--text-gray-color)]">
                            The stages an issue of this type can be in.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {statuses.map((status) => (
                            <div
                                key={status.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] px-3.5 py-3"
                            >
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: status.color,
                                        }}
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                            {status.name}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-1.5">
                                            <span className="text-[11px] text-[var(--text-gray-color)]">
                                                {
                                                    CATEGORY_OPTIONS.find(
                                                        (c) =>
                                                            c.value ===
                                                            status.category,
                                                    )?.label
                                                }
                                            </span>
                                            {status.isInitial && (
                                                <span className="rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                                    Initial
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {canUpdateWorkflow && (
                                    <button
                                        type="button"
                                        title="Delete status"
                                        onClick={() =>
                                            handleDeleteStatus(status.id)
                                        }
                                        className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                    >
                                        <Icon name="Trash" size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

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
                                <div className="mb-2.5 flex items-center gap-2">
                                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-gray-color)]">
                                        From
                                    </span>
                                    <WorkflowStatusBadge status={from} />
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
