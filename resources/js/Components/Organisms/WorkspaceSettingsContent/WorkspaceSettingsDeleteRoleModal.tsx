import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { WorkspaceRole } from '@/types/Roles';
import { router } from '@inertiajs/react';
import { useState } from 'react';

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
                    `The "${role.name}" role has been deleted.`,
                    'success',
                );
                onClose();
            },
            onError: () => {
                addAlert(`Failed to delete the "${role.name}" role.`, 'error');
            },
        });
    };

    return (
        <Modal isOpen={role !== null} onClose={handleClose} size="sm">
            <ModalHeader
                title="Delete role"
                onClose={handleClose}
                icon={
                    <span className="bg-[var(--error-color)]/10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--error-color)]">
                        <Icon name="TriangleAlert" size={16} />
                    </span>
                }
            />

            <div className="space-y-3 px-6 py-5">
                <p className="text-sm text-[var(--text-gray-color)]">
                    This permanently removes{' '}
                    <span className="font-semibold text-[var(--text-color)]">
                        {role?.name}
                    </span>{' '}
                    and its permission grants.{' '}
                    {role && role.memberCount > 0 ? (
                        <>
                            {role.memberCount}{' '}
                            {role.memberCount === 1 ? 'member' : 'members'}{' '}
                            currently holding this role will lose the access it
                            grants.
                        </>
                    ) : (
                        'No members currently hold this role.'
                    )}
                </p>
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
                    disabled={isDeleting}
                    className="cursor-pointer rounded-lg bg-[var(--error-color)] px-4 py-2 text-sm font-medium text-[var(--text-color)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isDeleting ? 'Deleting...' : 'Delete role'}
                </button>
            </footer>
        </Modal>
    );
}
