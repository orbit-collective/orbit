import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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
                title="Delete project"
                onClose={handleClose}
                icon={
                    <span className="bg-[var(--error-color)]/10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--error-color)]">
                        <Icon name="TriangleAlert" size={16} />
                    </span>
                }
            />

            <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-[var(--text-gray-color)]">
                    This permanently deletes{' '}
                    <span className="font-semibold text-[var(--text-color)]">
                        {projectName}
                    </span>
                    , along with every issue, comment, role, and activity log
                    that belongs to it. This cannot be undone.
                </p>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-color)]">
                        Type{' '}
                        <span className="font-semibold">{projectName}</span> to
                        confirm
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
                    disabled={isDeleting || confirmationText !== projectName}
                    className="cursor-pointer rounded-lg bg-[var(--error-color)] px-4 py-2 text-sm font-medium text-[var(--text-color)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isDeleting ? 'Deleting...' : 'Delete project'}
                </button>
            </footer>
        </Modal>
    );
}
