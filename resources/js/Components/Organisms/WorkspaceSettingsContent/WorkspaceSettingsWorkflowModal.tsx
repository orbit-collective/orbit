import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { WorkflowStatusCategory } from '@/types/Workflow';
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

            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
                <section className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                        Statuses
                    </h4>
                    <div className="space-y-2">
                        {statuses.map((status) => (
                            <div
                                key={status.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <WorkflowStatusBadge status={status} />
                                    {status.isInitial && (
                                        <span className="rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                            Initial
                                        </span>
                                    )}
                                    <span className="text-xs text-[var(--text-gray-color)]">
                                        {
                                            CATEGORY_OPTIONS.find(
                                                (c) =>
                                                    c.value === status.category,
                                            )?.label
                                        }
                                    </span>
                                </div>
                                {canUpdateWorkflow && (
                                    <button
                                        type="button"
                                        title="Delete status"
                                        onClick={() =>
                                            handleDeleteStatus(status.id)
                                        }
                                        className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                    >
                                        <Icon name="Trash" size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {canUpdateWorkflow && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--border-color)] p-3">
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="New status name"
                                variant="modal"
                                className="max-w-[180px]"
                            />
                            <select
                                value={newCategory}
                                onChange={(e) =>
                                    setNewCategory(
                                        e.target
                                            .value as WorkflowStatusCategory,
                                    )
                                }
                                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)]"
                            >
                                {CATEGORY_OPTIONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-1">
                                {LABEL_COLOR_PALETTE.slice(0, 8).map(
                                    (swatch) => (
                                        <button
                                            key={swatch}
                                            type="button"
                                            onClick={() => setNewColor(swatch)}
                                            aria-label={`Use color ${swatch}`}
                                            className={`h-5 w-5 shrink-0 rounded-full border ${newColor === swatch ? 'scale-110 border-white' : 'border-transparent'}`}
                                            style={{ backgroundColor: swatch }}
                                        />
                                    ),
                                )}
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
                    )}
                </section>

                <section className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                        Transitions
                    </h4>
                    <p className="text-xs text-[var(--text-gray-color)]">
                        Toggle which statuses an issue of this type may move
                        directly to, from its current status.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="p-2 text-left text-xs font-medium text-[var(--text-gray-color)]">
                                        From \ To
                                    </th>
                                    {statuses.map((to) => (
                                        <th
                                            key={to.id}
                                            className="p-2 text-center text-xs font-medium text-[var(--text-gray-color)]"
                                        >
                                            {to.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {statuses.map((from) => (
                                    <tr key={from.id}>
                                        <td className="p-2 text-xs font-medium text-[var(--text-color)]">
                                            {from.name}
                                        </td>
                                        {statuses.map((to) => (
                                            <td
                                                key={to.id}
                                                className="p-2 text-center"
                                            >
                                                {from.id === to.id ? (
                                                    <span className="text-[var(--text-gray-color)]">
                                                        —
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`Allow transition from ${from.name} to ${to.name}`}
                                                        checked={transitionExists(
                                                            from.id,
                                                            to.id,
                                                        )}
                                                        disabled={
                                                            !canUpdateWorkflow
                                                        }
                                                        onChange={() =>
                                                            handleToggleTransition(
                                                                from.id,
                                                                to.id,
                                                            )
                                                        }
                                                        className="h-4 w-4 cursor-pointer accent-[var(--accent-color)] disabled:cursor-not-allowed"
                                                    />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </Modal>
    );
}
