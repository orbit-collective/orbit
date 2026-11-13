import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { WorkspaceRole } from '@/types/Roles';

interface WorkspaceSettingsDeleteRoleModalProps {
    role: WorkspaceRole | null;
    projectId: number;
    onClose: () => void;
}

export default function WorkspaceSettingsDeleteRoleModal({
    role,
    projectId,
    onClose,
}: WorkspaceSettingsDeleteRoleModalProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleClose = () => {
        if (isDeleting) {
            return;
        }
        onClose();
    };

    const handleConfirm = () => {
        if (!role) {
            return;
        }

        router.delete(`/projects/${projectId}/roles/${role.id}`, {
            preserveScroll: true,
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                addAlert(
                    t('workspace_settings_modals_a.delete_role.deleted', {
                        name: role.name,
                    }),
                    'success',
                );
                onClose();
            },
            onError: () => {
                addAlert(
                    t('workspace_settings_modals_a.delete_role.failed', {
                        name: role.name,
                    }),
                    'error',
                );
            },
        });
    };

    return (
        <Modal isOpen={role !== null} onClose={handleClose} size="sm">
            <ModalHeader
                title={t('workspace_settings_modals_a.delete_role.title')}
                onClose={handleClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--error-color)/10 text-(--error-color)">
                        <Icon name="TriangleExclamationPoint" size={16} />
                    </span>
                }
            />

            <div className="space-y-3 px-6 py-5">
                <p className="text-sm text-(--text-gray-color)">
                    {t('workspace_settings_modals_a.delete_role.before')}{' '}
                    <span className="font-semibold text-(--text-color)">
                        {role?.name}
                    </span>{' '}
                    {t('workspace_settings_modals_a.delete_role.after')}{' '}
                    {role && role.memberCount > 0
                        ? tChoice(
                              'workspace_settings_modals_a.delete_role.members',
                              role.memberCount,
                          )
                        : t(
                              'workspace_settings_modals_a.delete_role.no_members',
                          )}
                </p>
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
                    disabled={isDeleting}
                    className="cursor-pointer rounded-lg bg-(--error-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isDeleting
                        ? t('workspace_settings_modals_a.deleting')
                        : t('workspace_settings_modals_a.delete_role.submit')}
                </button>
            </footer>
        </Modal>
    );
}
