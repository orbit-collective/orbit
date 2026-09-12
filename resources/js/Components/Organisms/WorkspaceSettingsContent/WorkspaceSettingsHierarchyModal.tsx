import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import { useState } from 'react';

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
    const { addAlert } = useAlert();
    const [isSaving, setIsSaving] = useState(false);

    if (!issueType) return null;

    const allowedIds = issueType.allowedChildTypeIds ?? [];
    const otherTypes = allIssueTypes.filter((t) => t.id !== issueType.id);

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
                        'Could not update allowed sub-issue types.',
                        'error',
                    ),
                onFinish: () => setIsSaving(false),
            },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader
                title={`${issueType.name} hierarchy`}
                onClose={onClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon name="GitBranch" size={16} />
                    </span>
                }
            />

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6">
                {!issueType.allowsChildren ? (
                    <div className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--border-color)] p-3.5 text-xs text-[var(--text-gray-color)]">
                        <Icon
                            name="Info"
                            size={14}
                            className="mt-0.5 shrink-0"
                        />
                        <p>
                            Turn on &quot;Allows sub-issues&quot; in this
                            type&apos;s general settings first, then choose
                            which types are allowed here.
                        </p>
                    </div>
                ) : (
                    <>
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--text-color)]">
                                Which types can be sub-issues
                            </h4>
                            <p className="mt-0.5 text-xs text-[var(--text-gray-color)]">
                                Leave everything unselected to allow any issue
                                type as a sub-issue of {issueType.name}.
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
                                                'ring-2 ring-[var(--accent-color)]',
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
