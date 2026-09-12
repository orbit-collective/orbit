import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface WorkspaceSettingsTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    issueType: IssueType | null;
    canManageTemplates?: boolean;
}

export default function WorkspaceSettingsTemplatesModal({
    isOpen,
    onClose,
    projectId,
    issueType,
    canManageTemplates = false,
}: WorkspaceSettingsTemplatesModalProps) {
    const { addAlert } = useAlert();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [defaultPriority, setDefaultPriority] = useState('');
    const [defaultLabels, setDefaultLabels] = useState('');

    if (!issueType) return null;

    const templates = issueType.templates ?? [];

    const resetForm = () => {
        setName('');
        setDescription('');
        setDefaultPriority('');
        setDefaultLabels('');
    };

    const handleAddTemplate = () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        router.post(
            route('projects.issue-types.templates.store', [
                projectId,
                issueType.id,
            ]),
            {
                name: trimmedName,
                description: description.trim() || null,
                default_priority: defaultPriority || null,
                default_labels: defaultLabels
                    .split(',')
                    .map((label) => label.trim())
                    .filter(Boolean),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: resetForm,
                onError: () =>
                    addAlert('Could not create this template.', 'error'),
            },
        );
    };

    const handleDeleteTemplate = (templateId: number) => {
        router.delete(
            route('projects.issue-types.templates.destroy', [
                projectId,
                issueType.id,
                templateId,
            ]),
            {
                preserveScroll: true,
                preserveState: true,
                onError: () =>
                    addAlert('Could not delete this template.', 'error'),
            },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader
                title={`${issueType.name} templates`}
                onClose={onClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon name="FileText" size={16} />
                    </span>
                }
            />

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                {templates.length === 0 && (
                    <p className="text-sm text-[var(--text-gray-color)]">
                        No templates yet for this issue type.
                    </p>
                )}

                <div className="space-y-2">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-color)] px-3 py-2.5"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--text-color)]">
                                    {template.name}
                                </p>
                                {template.description && (
                                    <p className="truncate text-xs text-[var(--text-gray-color)]">
                                        {template.description}
                                    </p>
                                )}
                            </div>
                            {canManageTemplates && (
                                <button
                                    type="button"
                                    title="Delete template"
                                    onClick={() =>
                                        handleDeleteTemplate(template.id)
                                    }
                                    className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                >
                                    <Icon name="Trash" size={13} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {canManageTemplates && (
                    <div className="space-y-2 rounded-lg border border-dashed border-[var(--border-color)] p-3">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Template name"
                            variant="modal"
                        />
                        <TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description prefilled on new issues (optional)"
                            variant="modal"
                            className="min-h-[56px]"
                        />
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={defaultPriority}
                                onChange={(e) =>
                                    setDefaultPriority(e.target.value)
                                }
                                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)]"
                            >
                                <option value="">Default priority</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                            <Input
                                value={defaultLabels}
                                onChange={(e) =>
                                    setDefaultLabels(e.target.value)
                                }
                                placeholder="Default labels (comma-separated)"
                                variant="modal"
                                className="max-w-[220px]"
                            />
                            <button
                                type="button"
                                onClick={handleAddTemplate}
                                disabled={!name.trim()}
                                className="ml-auto rounded-md bg-[var(--accent-color)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Add template
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
