import { useLaravelReactI18n } from 'laravel-react-i18n';
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
    const { t, tChoice } = useLaravelReactI18n();
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
                title={t('workspace_settings_modals_a.delete_priority.title')}
                onClose={handleClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--error-color)/10 text-(--error-color)">
                        <Icon name="TriangleExclamationPoint" size={16} />
                    </span>
                }
            />

            <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-(--text-gray-color)">
                    {t('workspace_settings_modals_a.delete_priority.before')}{' '}
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-(--border-color) px-2 py-0.5 text-xs font-medium text-(--text-color)"
                        style={{ verticalAlign: 'middle' }}
                    >
                        <PriorityIcon priority={priority} tooltip={false} />
                        {priority.name}
                    </span>{' '}
                    {t('workspace_settings_modals_a.delete_priority.after')}
                </p>

                {priority.issueCount > 0 ? (
                    <div className="space-y-1.5">
                        <label
                            htmlFor="priority-replacement"
                            className="text-xs font-medium text-(--text-gray-color)"
                        >
                            {tChoice(
                                'workspace_settings_modals_a.delete_priority.move_issues',
                                priority.issueCount,
                            )}
                        </label>
                        <select
                            id="priority-replacement"
                            value={replacement}
                            onChange={(e) => setReplacement(e.target.value)}
                            className="w-full cursor-pointer rounded-lg border border-(--border-color) bg-(--bg-color) px-3 py-2 text-sm text-(--text-color) focus:border-(--accent-color) focus:outline-hidden"
                        >
                            {otherPriorities.map((other) => (
                                <option key={other.id} value={String(other.id)}>
                                    {other.name}
                                </option>
                            ))}
                            <option value={NO_PRIORITY}>
                                {t(
                                    'workspace_settings_modals_a.delete_priority.no_priority',
                                )}
                            </option>
                        </select>
                    </div>
                ) : (
                    <p className="text-sm text-(--text-gray-color)">
                        {t(
                            'workspace_settings_modals_a.delete_priority.no_issues',
                        )}
                    </p>
                )}

                {nextDefault && (
                    <p className="rounded-lg border border-(--border-color) bg-(--bg-light-color) px-3 py-2 text-xs text-(--text-gray-color)">
                        {t(
                            'workspace_settings_modals_a.delete_priority.default_before',
                        )}{' '}
                        <span className="font-medium text-(--text-color)">
                            {nextDefault.name}
                        </span>{' '}
                        {t(
                            'workspace_settings_modals_a.delete_priority.default_after',
                        )}
                    </p>
                )}
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-(--bg-light-color) px-6 py-4">
                <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-(--text-gray-color) transition-colors duration-150 hover:text-(--text-color)"
                >
                    {t('workspace_settings_modals_a.cancel')}
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    className="cursor-pointer rounded-lg bg-(--error-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-opacity hover:opacity-90"
                >
                    {t('workspace_settings_modals_a.delete_priority.submit')}
                </button>
            </footer>
        </Modal>
    );
}
