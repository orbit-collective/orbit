import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { IssueType } from '@/types/IssueTypes';
import { icons } from 'lucide-react';

interface WorkspaceSettingsDeleteIssueTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    issueType: IssueType | null;
    onConfirm: () => void;
}

export default function WorkspaceSettingsDeleteIssueTypeModal({
    isOpen,
    onClose,
    issueType,
    onConfirm,
}: WorkspaceSettingsDeleteIssueTypeModalProps) {
    if (!issueType) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader
                title="Delete issue type"
                onClose={onClose}
                icon={
                    <span className="bg-[var(--error-color)]/10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--error-color)]">
                        <Icon name="TriangleAlert" size={16} />
                    </span>
                }
            />

            <div className="space-y-3 px-6 py-5">
                <p className="text-sm text-[var(--text-gray-color)]">
                    This removes{' '}
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-color)]"
                        style={{ verticalAlign: 'middle' }}
                    >
                        <Icon
                            name={issueType.icon as keyof typeof icons}
                            size={12}
                            color={issueType.color}
                        />
                        {issueType.name}
                    </span>{' '}
                    from this project&apos;s issue type catalog. This cannot be
                    undone.
                </p>
                <p className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-light-color)] px-3 py-2 text-xs text-[var(--text-gray-color)]">
                    If any issues still use this type, deleting it will fail —
                    reassign those issues to a different type first.
                </p>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[var(--bg-light-color)] px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    className="cursor-pointer rounded-lg bg-[var(--error-color)] px-4 py-2 text-sm font-medium text-[var(--text-color)] transition-opacity hover:opacity-90"
                >
                    Delete issue type
                </button>
            </footer>
        </Modal>
    );
}
