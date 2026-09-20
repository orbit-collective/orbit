import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import Modal from '@/Components/Atoms/Modal/Modal';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { IssueType, IssueTypeTemplate } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { cn } from '@/utils/cn';
import {
    extractImageFiles,
    insertMarkdownImage,
    nextImageRange,
} from '@/utils/imagePaste';
import { router } from '@inertiajs/react';
import React, { useRef, useState } from 'react';

interface WorkspaceSettingsTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    issueType: IssueType | null;
    labels?: ProjectLabel[];
    canManageTemplates?: boolean;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
];

const priorityLabel = (value: string | null) =>
    PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? null;

export default function WorkspaceSettingsTemplatesModal({
    isOpen,
    onClose,
    projectId,
    issueType,
    labels = [],
    canManageTemplates = false,
}: WorkspaceSettingsTemplatesModalProps) {
    const { addAlert } = useAlert();
    const { uploadImage } = useImageUpload(projectId);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [defaultPriority, setDefaultPriority] = useState<string | null>(null);
    const [defaultLabels, setDefaultLabels] = useState<string[]>([]);

    if (!issueType) return null;

    const templates = issueType.templates ?? [];
    const isEditing = editingId !== null;
    const isFormOpen = isComposing || isEditing;

    const closeForm = () => {
        setEditingId(null);
        setIsComposing(false);
        setName('');
        setDescription('');
        setDefaultPriority(null);
        setDefaultLabels([]);
    };

    const startCreating = () => {
        closeForm();
        setIsComposing(true);
    };

    const startEditing = (template: IssueTypeTemplate) => {
        setIsComposing(false);
        setEditingId(template.id);
        setName(template.name);
        setDescription(template.description ?? '');
        setDefaultPriority(template.defaultPriority);
        setDefaultLabels(template.defaultLabels ?? []);
    };

    /**
     * Uploads a batch one at a time and moves the insertion point past each
     * image as it lands, so several files pasted at once keep their order
     * instead of every one of them splicing into the original range.
     */
    const insertImages = async (
        files: File[],
        range: { start: number; end: number },
    ) => {
        let target = range;

        for (const file of files) {
            const at = target;

            try {
                const url = await uploadImage(file);

                setDescription((current) => {
                    const result = insertMarkdownImage(current, at, file, url);

                    // This component has no pendingCaret effect the way
                    // CommentForm does, and needs none for a single field - the
                    // textarea is still mounted, it just lost its selection to
                    // the re-render.
                    requestAnimationFrame(() => {
                        descriptionRef.current?.focus();
                        descriptionRef.current?.setSelectionRange(
                            result.caret,
                            result.caret,
                        );
                    });

                    return result.body;
                });

                target = nextImageRange(at, file, url);
            } catch {
                // The uploader already reported the failure to the user.
            }
        }
    };

    const handleDescriptionPaste = (
        e: React.ClipboardEvent<HTMLTextAreaElement>,
    ) => {
        const files = extractImageFiles(e.clipboardData);

        if (files.length === 0) return;

        e.preventDefault();

        const { selectionStart: start, selectionEnd: end } = e.currentTarget;

        void insertImages(files, { start, end });
    };

    const handleDescriptionDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        const files = extractImageFiles(e.dataTransfer);

        if (files.length === 0) return;

        e.preventDefault();

        const caret = e.currentTarget.selectionStart;

        void insertImages(files, { start: caret, end: caret });
    };

    const toggleLabel = (label: string) =>
        setDefaultLabels((current) =>
            current.includes(label)
                ? current.filter((item) => item !== label)
                : [...current, label],
        );

    const handleSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        const payload = {
            name: trimmedName,
            description: description.trim() || null,
            default_priority: defaultPriority,
            default_labels: defaultLabels,
        };

        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: closeForm,
            onError: () => addAlert('Could not save this template.', 'error'),
        };

        if (isEditing) {
            router.patch(
                route('projects.issue-types.templates.update', [
                    projectId,
                    issueType.id,
                    editingId,
                ]),
                payload,
                options,
            );
            return;
        }

        router.post(
            route('projects.issue-types.templates.store', [
                projectId,
                issueType.id,
            ]),
            payload,
            options,
        );
    };

    const handleDelete = (templateId: number) => {
        router.delete(
            route('projects.issue-types.templates.destroy', [
                projectId,
                issueType.id,
                templateId,
            ]),
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: closeForm,
                onError: () =>
                    addAlert('Could not delete this template.', 'error'),
            },
        );
    };

    return (
        // Without the provider LabelBadge falls back to a hashed colour, so
        // the chips here would not match the project's real label colours.
        <ProjectLabelsProvider labels={labels}>
            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalHeader
                    title={`${issueType.name} templates`}
                    onClose={onClose}
                    icon={
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                            <Icon name="FileText" size={16} />
                        </span>
                    }
                />

                <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-6">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-[var(--text-gray-color)]">
                            The starting point for a new {issueType.name}. The
                            first template is applied automatically; anything
                            typed on the issue itself wins over it.
                        </p>
                        {canManageTemplates && !isFormOpen && (
                            <button
                                type="button"
                                onClick={startCreating}
                                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-2 py-1 text-xs font-medium text-[var(--text-muted-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                            >
                                <Icon name="Plus" size={13} />
                                New template
                            </button>
                        )}
                    </div>

                    {templates.length === 0 && !isFormOpen ? (
                        <p className="rounded-xl border border-dashed border-[var(--border-color)] px-3.5 py-6 text-center text-xs text-[var(--text-gray-color)]">
                            No templates yet for this issue type.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {templates.map((template, index) => (
                                <div
                                    key={template.id}
                                    className={cn(
                                        'rounded-xl border bg-[var(--surface-color)] px-3.5 py-3 transition-colors',
                                        editingId === template.id
                                            ? 'border-[var(--accent-color)]'
                                            : 'border-[var(--border-color)]',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                                    {template.name}
                                                </p>
                                                {index === 0 && (
                                                    <span className="rounded-full border border-[var(--accent-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-color)]">
                                                        Applied by default
                                                    </span>
                                                )}
                                                {priorityLabel(
                                                    template.defaultPriority,
                                                ) && (
                                                    <span className="rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                                        {priorityLabel(
                                                            template.defaultPriority,
                                                        )}{' '}
                                                        priority
                                                    </span>
                                                )}
                                            </div>

                                            {template.defaultLabels.length >
                                                0 && (
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {template.defaultLabels.map(
                                                        (label) => (
                                                            <LabelBadge
                                                                key={label}
                                                                label={label}
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {canManageTemplates && (
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    title="Edit template"
                                                    aria-label={`Edit ${template.name}`}
                                                    onClick={() =>
                                                        startEditing(template)
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                                                >
                                                    <Icon
                                                        name="Pencil"
                                                        size={13}
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Delete template"
                                                    aria-label={`Delete ${template.name}`}
                                                    onClick={() =>
                                                        handleDelete(
                                                            template.id,
                                                        )
                                                    }
                                                    className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                                >
                                                    <Icon
                                                        name="Trash"
                                                        size={13}
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {template.description && (
                                        <pre className="mt-2 max-h-24 overflow-hidden whitespace-pre-wrap rounded-lg bg-[var(--bg-color)] px-2.5 py-2 font-sans text-[11px] leading-relaxed text-[var(--text-gray-color)]">
                                            {template.description}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {canManageTemplates && isFormOpen && (
                        <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
                            <h4 className="text-sm font-semibold text-[var(--text-color)]">
                                {isEditing ? 'Edit template' : 'New template'}
                            </h4>

                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Template name"
                                variant="modal"
                            />
                            <TextArea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onPaste={handleDescriptionPaste}
                                onDrop={handleDescriptionDrop}
                                placeholder="Description every new issue of this type starts from"
                                variant="modal"
                                className="min-h-[120px] font-mono text-xs"
                            />

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                    Default priority
                                </p>
                                <InlineSelectDropdown
                                    label="Default priority"
                                    placeholder="No default"
                                    options={PRIORITY_OPTIONS}
                                    value={defaultPriority}
                                    onChange={setDefaultPriority}
                                    subtle
                                />
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                    Default labels
                                </p>
                                {labels.length === 0 ? (
                                    <p className="text-xs text-[var(--text-gray-color)]">
                                        This project has no labels yet.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {labels.map((label) => (
                                            <button
                                                key={label.id}
                                                type="button"
                                                aria-pressed={defaultLabels.includes(
                                                    label.name,
                                                )}
                                                onClick={() =>
                                                    toggleLabel(label.name)
                                                }
                                                className={cn(
                                                    'cursor-pointer rounded-full border-none bg-transparent p-0 transition-opacity',
                                                    !defaultLabels.includes(
                                                        label.name,
                                                    ) && 'opacity-40',
                                                )}
                                            >
                                                <LabelBadge
                                                    label={label.name}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!name.trim()}
                                    className="rounded-md bg-[var(--accent-color)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isEditing
                                        ? 'Save changes'
                                        : 'Add template'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </ProjectLabelsProvider>
    );
}
