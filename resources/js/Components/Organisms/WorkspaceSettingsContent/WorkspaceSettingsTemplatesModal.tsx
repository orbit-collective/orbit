import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useRef, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import Modal from '@/Components/Atoms/Modal/Modal';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { useImageInsertion } from '@/hooks/useImageInsertion';
import { useImageUpload } from '@/hooks/useImageUpload';
import { IssueType, IssueTypeTemplate } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import { cn } from '@/utils/cn';
import { extractImageFiles } from '@/utils/imagePaste';

interface WorkspaceSettingsTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    issueType: IssueType | null;
    labels?: ProjectLabel[];
    priorities?: ProjectPriority[];
    canManageTemplates?: boolean;
}

export default function WorkspaceSettingsTemplatesModal({
    isOpen,
    onClose,
    projectId,
    issueType,
    labels = [],
    priorities = [],
    canManageTemplates = false,
}: WorkspaceSettingsTemplatesModalProps) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const priorityOptions = priorities.map((priority) => ({
        value: priority.name,
        label: priority.name,
    }));
    // A template keeps its default priority by name; a name the project no
    // longer has reads as no default.
    const priorityLabel = (value: string | null) =>
        priorityOptions.find(
            (option) => option.value.toLowerCase() === value?.toLowerCase(),
        )?.label ?? null;
    const { uploadImage } = useImageUpload(projectId);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [defaultPriority, setDefaultPriority] = useState<string | null>(null);
    const [defaultLabels, setDefaultLabels] = useState<string[]>([]);
    const { insertImages: spliceImages } = useImageInsertion(
        description,
        setDescription,
        descriptionRef,
    );

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
     * Splices each uploaded image in where it was pasted, however the text
     * changed while it uploaded (see useImageInsertion).
     */
    const insertImages = (
        files: File[],
        range: { start: number; end: number },
    ) =>
        spliceImages(files, range, uploadImage, ({ caret }) => {
            // This component has no pendingCaret effect the way CommentForm
            // does, and needs none for a single field - the textarea is still
            // mounted, it just lost its selection to the re-render.
            requestAnimationFrame(() => {
                descriptionRef.current?.focus();
                descriptionRef.current?.setSelectionRange(caret, caret);
            });
        });

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
            onError: () =>
                addAlert(
                    t('workspace_settings_templates_modal.save_error'),
                    'error',
                ),
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
                    addAlert(
                        t('workspace_settings_templates_modal.delete_error'),
                        'error',
                    ),
            },
        );
    };

    return (
        // Without the provider LabelBadge falls back to a hashed colour, so
        // the chips here would not match the project's real label colours.
        <ProjectLabelsProvider labels={labels}>
            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalHeader
                    title={t('workspace_settings_templates_modal.title', {
                        type: issueType.name,
                    })}
                    onClose={onClose}
                    icon={
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--accent-color-opacity) text-(--accent-color)">
                            <Icon name="FileText" size={16} />
                        </span>
                    }
                />

                <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-6">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-(--text-gray-color)">
                            {t('workspace_settings_templates_modal.intro', {
                                type: issueType.name,
                            })}
                        </p>
                        {canManageTemplates && !isFormOpen && (
                            <button
                                type="button"
                                onClick={startCreating}
                                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-2 py-1 text-xs font-medium text-(--text-muted-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color)"
                            >
                                <Icon name="Plus" size={13} />
                                {t('workspace_settings_templates_modal.new')}
                            </button>
                        )}
                    </div>

                    {templates.length === 0 && !isFormOpen ? (
                        <p className="rounded-xl border border-dashed border-(--border-color) px-3.5 py-6 text-center text-xs text-(--text-gray-color)">
                            {t('workspace_settings_templates_modal.empty')}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {templates.map((template, index) => (
                                <div
                                    key={template.id}
                                    className={cn(
                                        'rounded-xl border bg-(--surface-color) px-3.5 py-3 transition-colors',
                                        editingId === template.id
                                            ? 'border-(--accent-color)'
                                            : 'border-(--border-color)',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className="truncate text-sm font-medium text-(--text-color)">
                                                    {template.name}
                                                </p>
                                                {index === 0 && (
                                                    <span className="rounded-full border border-(--accent-color) px-1.5 py-0.5 text-[10px] font-medium text-(--accent-color)">
                                                        {t(
                                                            'workspace_settings_templates_modal.applied_by_default',
                                                        )}
                                                    </span>
                                                )}
                                                {priorityLabel(
                                                    template.defaultPriority,
                                                ) && (
                                                    <span className="rounded-full border border-(--border-color) px-1.5 py-0.5 text-[10px] font-medium text-(--text-gray-color)">
                                                        {t(
                                                            'workspace_settings_templates_modal.priority_badge',
                                                            {
                                                                priority:
                                                                    priorityLabel(
                                                                        template.defaultPriority,
                                                                    ) ?? '',
                                                            },
                                                        )}
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
                                                    title={t(
                                                        'workspace_settings_templates_modal.edit_title',
                                                    )}
                                                    aria-label={t(
                                                        'workspace_settings_templates_modal.edit_aria',
                                                        {
                                                            name: template.name,
                                                        },
                                                    )}
                                                    onClick={() =>
                                                        startEditing(template)
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color)"
                                                >
                                                    <Icon
                                                        name="Pencil"
                                                        size={13}
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    title={t(
                                                        'workspace_settings_templates_modal.delete_title',
                                                    )}
                                                    aria-label={t(
                                                        'workspace_settings_templates_modal.delete_aria',
                                                        {
                                                            name: template.name,
                                                        },
                                                    )}
                                                    onClick={() =>
                                                        handleDelete(
                                                            template.id,
                                                        )
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-gray-color) transition-colors hover:bg-(--error-color)/10 hover:text-(--error-color)"
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
                                        <pre className="mt-2 max-h-24 overflow-hidden rounded-lg bg-(--bg-color) px-2.5 py-2 font-sans text-[11px] leading-relaxed whitespace-pre-wrap text-(--text-gray-color)">
                                            {template.description}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {canManageTemplates && isFormOpen && (
                        <div className="space-y-3 rounded-xl border border-(--border-color) bg-(--surface-color) p-4">
                            <h4 className="text-sm font-semibold text-(--text-color)">
                                {isEditing
                                    ? t(
                                          'workspace_settings_templates_modal.form_edit',
                                      )
                                    : t(
                                          'workspace_settings_templates_modal.form_new',
                                      )}
                            </h4>

                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t(
                                    'workspace_settings_templates_modal.name_placeholder',
                                )}
                                variant="modal"
                            />
                            <TextArea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onPaste={handleDescriptionPaste}
                                onDrop={handleDescriptionDrop}
                                placeholder={t(
                                    'workspace_settings_templates_modal.description_placeholder',
                                )}
                                variant="modal"
                                className="min-h-[120px] font-mono text-xs"
                            />

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold tracking-wider text-(--text-muted-color) uppercase">
                                    {t(
                                        'workspace_settings_templates_modal.default_priority',
                                    )}
                                </p>
                                <InlineSelectDropdown
                                    label={t(
                                        'workspace_settings_templates_modal.default_priority',
                                    )}
                                    placeholder={t(
                                        'workspace_settings_templates_modal.no_default',
                                    )}
                                    options={priorityOptions}
                                    value={defaultPriority}
                                    onChange={setDefaultPriority}
                                    subtle
                                />
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold tracking-wider text-(--text-muted-color) uppercase">
                                    {t(
                                        'workspace_settings_templates_modal.default_labels',
                                    )}
                                </p>
                                {labels.length === 0 ? (
                                    <p className="text-xs text-(--text-gray-color)">
                                        {t(
                                            'workspace_settings_templates_modal.no_labels',
                                        )}
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
                                    className="rounded-md px-3 py-1.5 text-sm font-medium text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color)"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!name.trim()}
                                    className="rounded-md bg-(--accent-color) px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isEditing
                                        ? t(
                                              'workspace_settings_templates_modal.save_changes',
                                          )
                                        : t(
                                              'workspace_settings_templates_modal.add',
                                          )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </ProjectLabelsProvider>
    );
}
