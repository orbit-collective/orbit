import { useLaravelReactI18n } from 'laravel-react-i18n';
import type { icons } from 'lucide-react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { IssueType } from '@/types/IssueTypes';

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
    const { t } = useLaravelReactI18n();

    if (!issueType) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader
                title={t('workspace_settings_modals_a.delete_issue_type.title')}
                onClose={onClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--error-color)/10 text-(--error-color)">
                        <Icon name="TriangleExclamationPoint" size={16} />
                    </span>
                }
            />

            <div className="space-y-3 px-6 py-5">
                <p className="text-sm text-(--text-gray-color)">
                    {t('workspace_settings_modals_a.delete_issue_type.before')}{' '}
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-(--border-color) px-2 py-0.5 text-xs font-medium text-(--text-color)"
                        style={{ verticalAlign: 'middle' }}
                    >
                        <Icon
                            name={issueType.icon as keyof typeof icons}
                            size={12}
                            color={issueType.color}
                        />
                        {issueType.name}
                    </span>{' '}
                    {t('workspace_settings_modals_a.delete_issue_type.after')}
                </p>
                <p className="rounded-lg border border-(--border-color) bg-(--bg-light-color) px-3 py-2 text-xs text-(--text-gray-color)">
                    {t('workspace_settings_modals_a.delete_issue_type.warning')}
                </p>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-(--bg-light-color) px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-(--text-gray-color) transition-colors duration-150 hover:text-(--text-color)"
                >
                    {t('workspace_settings_modals_a.cancel')}
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    className="cursor-pointer rounded-lg bg-(--error-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-opacity hover:opacity-90"
                >
                    {t('workspace_settings_modals_a.delete_issue_type.submit')}
                </button>
            </footer>
        </Modal>
    );
}
