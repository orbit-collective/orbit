import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useState } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { ProjectMember } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';

interface WorkspaceSettingsTransferOwnershipModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    members: ProjectMember[];
}

export default function WorkspaceSettingsTransferOwnershipModal({
    isOpen,
    onClose,
    projectId,
    members,
}: WorkspaceSettingsTransferOwnershipModalProps) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(
        null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const candidates = members.filter((member) => member.role !== 'owner');
    const selectedMember =
        candidates.find((member) => member.id === selectedMemberId) ?? null;

    useEffect(() => {
        if (!isOpen) {
            setSelectedMemberId(null);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        onClose();
    };

    const handleConfirm = () => {
        if (!selectedMember) {
            return;
        }

        router.patch(
            `/projects/${projectId}/transfer-ownership`,
            { user_id: selectedMember.id },
            {
                preserveScroll: true,
                onStart: () => setIsSubmitting(true),
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => {
                    addAlert(
                        t('workspace_settings_transfer_ownership.success', {
                            name: selectedMember.name,
                        }),
                        'success',
                    );
                    onClose();
                },
                onError: () => {
                    addAlert(
                        t('workspace_settings_transfer_ownership.error'),
                        'error',
                    );
                },
            },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="sm">
            <ModalHeader
                title={t('workspace_settings_transfer_ownership.title')}
                onClose={handleClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--warning-color)/10 text-(--warning-color)">
                        <Icon name="Crown" size={16} />
                    </span>
                }
            />

            <div className="space-y-3 px-6 py-5">
                <p className="text-sm text-(--text-gray-color)">
                    {t('workspace_settings_transfer_ownership.warning')}
                </p>

                {candidates.length === 0 ? (
                    <p className="text-sm text-(--text-gray-color)">
                        {t(
                            'workspace_settings_transfer_ownership.no_candidates',
                        )}
                    </p>
                ) : (
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                        {candidates.map((member) => (
                            <button
                                key={member.id}
                                type="button"
                                onClick={() => setSelectedMemberId(member.id)}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                                    selectedMemberId === member.id
                                        ? 'border-(--accent-color) bg-(--accent-color-opacity)'
                                        : 'border-(--border-color) bg-(--bg-color) hover:border-(--border-color-strong)',
                                )}
                            >
                                <Avatar
                                    src={member.avatar ?? undefined}
                                    initials={member.name.charAt(0)}
                                    size="sm"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-(--text-color)">
                                        {member.name}
                                    </p>
                                    <p className="truncate text-xs text-(--text-gray-color)">
                                        {member.email}
                                    </p>
                                </div>
                                {selectedMemberId === member.id && (
                                    <Icon
                                        name="Check"
                                        size={14}
                                        className="shrink-0 text-(--accent-color)"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-(--bg-light-color) px-6 py-4">
                <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-(--text-gray-color) transition-colors duration-150 hover:text-(--text-color)"
                >
                    {t('common.cancel')}
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selectedMember || isSubmitting}
                    className="cursor-pointer rounded-lg bg-(--warning-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isSubmitting
                        ? t(
                              'workspace_settings_transfer_ownership.transferring',
                          )
                        : t('workspace_settings_transfer_ownership.title')}
                </button>
            </footer>
        </Modal>
    );
}
