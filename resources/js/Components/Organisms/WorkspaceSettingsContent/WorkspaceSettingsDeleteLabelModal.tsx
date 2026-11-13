import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { ProjectLabel } from '@/types/Labels';

interface WorkspaceSettingsDeleteLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    label: ProjectLabel | null;
    onConfirm: () => void;
}

export default function WorkspaceSettingsDeleteLabelModal({
    isOpen,
    onClose,
    label,
    onConfirm,
}: WorkspaceSettingsDeleteLabelModalProps) {
    const { t } = useLaravelReactI18n();

    if (!label) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader
                title={t('workspace_settings_modals_a.delete_label.title')}
                onClose={onClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--error-color)/10 text-(--error-color)">
                        <Icon name="TriangleExclamationPoint" size={16} />
                    </span>
                }
            />

            <div className="space-y-3 px-6 py-5">
                <p className="text-sm text-(--text-gray-color)">
                    {t('workspace_settings_modals_a.delete_label.before')}{' '}
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-(--border-color) px-2 py-0.5 text-xs font-medium text-(--text-color)"
                        style={{ verticalAlign: 'middle' }}
                    >
                        <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                    </span>{' '}
                    {t('workspace_settings_modals_a.delete_label.after')}
                </p>
                {label.isSystem && (
                    <p className="rounded-lg border border-(--error-color)/20 bg-(--error-color)/5 px-3 py-2 text-xs text-(--error-color)">
                        {t(
                            'workspace_settings_modals_a.delete_label.system_warning',
                        )}
                    </p>
                )}
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
                    {t('workspace_settings_modals_a.delete_label.submit')}
                </button>
            </footer>
        </Modal>
    );
}
