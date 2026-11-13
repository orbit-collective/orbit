import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { cn } from '@/utils/cn';

interface WorkspaceSettingsHierarchyModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    issueType: IssueType | null;
    allIssueTypes: IssueType[];
    canUpdateIssueTypes?: boolean;
}

export default function WorkspaceSettingsHierarchyModal({
    isOpen,
    onClose,
    projectId,
    issueType,
    allIssueTypes,
    canUpdateIssueTypes = false,
}: WorkspaceSettingsHierarchyModalProps) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const [isSaving, setIsSaving] = useState(false);

    if (!issueType) return null;

    const allowedIds = issueType.allowedChildTypeIds ?? [];
    const otherTypes = allIssueTypes.filter((type) => type.id !== issueType.id);

    const handleToggle = (childTypeId: number) => {
        const next = allowedIds.includes(childTypeId)
            ? allowedIds.filter((id) => id !== childTypeId)
            : [...allowedIds, childTypeId];

        setIsSaving(true);
        router.patch(
            route('projects.issue-types.allowed-children.update', [
                projectId,
                issueType.id,
            ]),
            { child_issue_type_ids: next },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () =>
                    addAlert(
                        t(
                            'workspace_settings_modals_a.hierarchy.update_failed',
                        ),
                        'error',
                    ),
                onFinish: () => setIsSaving(false),
            },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader
                title={t('workspace_settings_modals_a.hierarchy.title', {
                    name: issueType.name,
                })}
                onClose={onClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--accent-color-opacity) text-(--accent-color)">
                        <Icon name="GitBranch" size={16} />
                    </span>
                }
            />

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6">
                {!issueType.allowsChildren ? (
                    <div className="flex items-start gap-2 rounded-xl border border-dashed border-(--border-color) p-3.5 text-xs text-(--text-gray-color)">
                        <Icon
                            name="Info"
                            size={14}
                            className="mt-0.5 shrink-0"
                        />
                        <p>
                            {t(
                                'workspace_settings_modals_a.hierarchy.enable_first',
                            )}
                        </p>
                    </div>
                ) : (
                    <>
                        <div>
                            <h4 className="text-sm font-semibold text-(--text-color)">
                                {t(
                                    'workspace_settings_modals_a.hierarchy.heading',
                                )}
                            </h4>
                            <p className="mt-0.5 text-xs text-(--text-gray-color)">
                                {t(
                                    'workspace_settings_modals_a.hierarchy.hint',
                                    {
                                        name: issueType.name,
                                    },
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {otherTypes.map((type) => {
                                const isAllowed = allowedIds.includes(type.id);
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        disabled={
                                            !canUpdateIssueTypes || isSaving
                                        }
                                        aria-pressed={isAllowed}
                                        onClick={() => handleToggle(type.id)}
                                        className={cn(
                                            'rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
                                            isAllowed &&
                                                'ring-2 ring-(--accent-color)',
                                        )}
                                    >
                                        <IssueTypeBadge issueType={type} />
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
