import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';

interface WorkspaceSettingsDeleteProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    projectName: string;
}

export default function WorkspaceSettingsDeleteProjectModal({
    isOpen,
    onClose,
    projectId,
    projectName,
}: WorkspaceSettingsDeleteProjectModalProps) {
    const { t } = useLaravelReactI18n();
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setConfirmationText('');
        }
    }, [isOpen]);

    const handleClose = () => {
        if (isDeleting) {
            return;
        }
        onClose();
    };

    const handleConfirm = () => {
        if (confirmationText !== projectName) {
            return;
        }

        router.delete(`/projects/${projectId}`, {
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="sm">
            <ModalHeader
                title={t('workspace_settings_modals_a.delete_project.title')}
                onClose={handleClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--error-color)/10 text-(--error-color)">
                        <Icon name="TriangleExclamationPoint" size={16} />
                    </span>
                }
            />

            <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-(--text-gray-color)">
                    {t('workspace_settings_modals_a.delete_project.before')}{' '}
                    <span className="font-semibold text-(--text-color)">
                        {projectName}
                    </span>
                    {t('workspace_settings_modals_a.delete_project.after')}
                </p>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-(--text-color)">
                        {t(
                            'workspace_settings_modals_a.delete_project.type_before',
                        )}{' '}
                        <span className="font-semibold">{projectName}</span>{' '}
                        {t(
                            'workspace_settings_modals_a.delete_project.type_after',
                        )}
                    </label>
                    <Input
                        value={confirmationText}
                        onChange={(event) =>
                            setConfirmationText(event.target.value)
                        }
                        placeholder={projectName}
                        variant="modal"
                    />
                </div>
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
                    disabled={isDeleting || confirmationText !== projectName}
                    className="cursor-pointer rounded-lg bg-(--error-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isDeleting
                        ? t('workspace_settings_modals_a.deleting')
                        : t(
                              'workspace_settings_modals_a.delete_project.submit',
                          )}
                </button>
            </footer>
        </Modal>
    );
}
