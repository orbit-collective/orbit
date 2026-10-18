import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { SettingsPriority } from '@/types/Priorities';

interface WorkspaceSettingsDeletePriorityModalProps {
    isOpen: boolean;
    onClose: () => void;
    priority: SettingsPriority | null;
    /** The project's other priorities, which its issues can move to. */
    otherPriorities: SettingsPriority[];
    /** The chosen priority's id, or null to leave the issues without one. */
    onConfirm: (replacementId: number | null) => void;
}

const NO_PRIORITY = '';

export default function WorkspaceSettingsDeletePriorityModal({
    isOpen,
    onClose,
    priority,
    otherPriorities,
    onConfirm,
}: WorkspaceSettingsDeletePriorityModalProps) {
    const [replacement, setReplacement] = useState(NO_PRIORITY);

    if (!priority) return null;

    const handleConfirm = () => {
        onConfirm(replacement === NO_PRIORITY ? null : Number(replacement));
        setReplacement(NO_PRIORITY);
        onClose();
    };

    const handleClose = () => {
        setReplacement(NO_PRIORITY);
        onClose();
    };

    const nextDefault =
        priority.isDefault &&
        (otherPriorities.find((other) => String(other.id) === replacement) ??
            otherPriorities[0]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="sm">
            <ModalHeader
                title="Delete priority"
                onClose={handleClose}
                icon={
                    <span className="bg-[var(--error-color)]/10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--error-color)]">
                        <Icon name="TriangleAlert" size={16} />
                    </span>
                }
            />

            <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-[var(--text-gray-color)]">
                    This removes{' '}
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-color)]"
                        style={{ verticalAlign: 'middle' }}
                    >
                        <PriorityIcon priority={priority} tooltip={false} />
                        {priority.name}
                    </span>{' '}
                    from this project&apos;s priority scale. This cannot be
                    undone.
                </p>

                {priority.issueCount > 0 ? (
                    <div className="space-y-1.5">
                        <label
                            htmlFor="priority-replacement"
                            className="text-xs font-medium text-[var(--text-gray-color)]"
                        >
                            {priority.issueCount === 1
                                ? 'Move its 1 issue to'
                                : `Move its ${priority.issueCount} issues to`}
                        </label>
                        <select
                            id="priority-replacement"
                            value={replacement}
                            onChange={(e) => setReplacement(e.target.value)}
                            className="w-full cursor-pointer rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] px-3 py-2 text-sm text-[var(--text-color)] focus:border-[var(--accent-color)] focus:outline-none"
                        >
                            {otherPriorities.map((other) => (
                                <option key={other.id} value={String(other.id)}>
                                    {other.name}
                                </option>
                            ))}
                            <option value={NO_PRIORITY}>No priority</option>
                        </select>
                    </div>
                ) : (
                    <p className="text-sm text-[var(--text-gray-color)]">
                        No issues use this priority.
                    </p>
                )}

                {nextDefault && (
                    <p className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-light-color)] px-3 py-2 text-xs text-[var(--text-gray-color)]">
                        This is the default for new issues.{' '}
                        <span className="font-medium text-[var(--text-color)]">
                            {nextDefault.name}
                        </span>{' '}
                        becomes the default instead.
                    </p>
                )}
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[var(--bg-light-color)] px-6 py-4">
                <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    className="cursor-pointer rounded-lg bg-[var(--error-color)] px-4 py-2 text-sm font-medium text-[var(--text-color)] transition-opacity hover:opacity-90"
                >
                    Delete priority
                </button>
            </footer>
        </Modal>
    );
}
