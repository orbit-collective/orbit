import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useRef, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import Modal from '@/Components/Atoms/Modal/Modal';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { IssueType, IssueTypeTemplate } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import { cn } from '@/utils/cn';

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
    const formRef = useRef<HTMLDivElement>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [defaultPriority, setDefaultPriority] = useState<string | null>(null);
    const [defaultLabels, setDefaultLabels] = useState<string[]>([]);
    const isFormOpen = isComposing || editingId !== null;

    // The form can open far down a long list: bring it into view.
    useEffect(() => {
        if (isFormOpen) {
            formRef.current?.scrollIntoView?.({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [isFormOpen, editingId]);

    if (!issueType) return null;

    const templates = issueType.templates ?? [];
    const isEditing = editingId !== null;

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

    const fieldLabel =
        'text-[10px] font-bold tracking-wider text-(--text-muted-color) uppercase';

    // Long descriptions are cut in the list; a fade says there is more.
    const isLong = (text: string) =>
        text.length > 400 || text.split('\n').length > 8;

    const form = (
        <div
            ref={formRef}
            className="space-y-4 rounded-xl border border-(--accent-color)/40 bg-(--surface-color) p-4"
        >
            <h4 className="text-sm font-semibold text-(--text-color)">
                {isEditing
                    ? t('workspace_settings_templates_modal.form_edit')
                    : t('workspace_settings_templates_modal.form_new')}
            </h4>

            <div className="space-y-1.5">
                <label htmlFor="template-name" className={fieldLabel}>
                    {t('workspace_settings_templates_modal.name_label')}
                </label>
                <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(
                        'workspace_settings_templates_modal.name_placeholder',
                    )}
                    variant="modal"
                />
            </div>

            <div className="space-y-1.5">
                <p className={fieldLabel}>
                    {t('workspace_settings_templates_modal.description_label')}
                </p>
                {/* The same editor as the issue description, so the template
                    is written as it will look on the issue it creates. */}
                <EditableMarkdown
                    variant="field"
                    value={description}
                    onChange={setDescription}
                    onImageUpload={uploadImage}
                    placeholder={t(
                        'workspace_settings_templates_modal.description_placeholder',
                    )}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
                <div className="space-y-1.5">
                    <p className={fieldLabel}>
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
                    <p className={fieldLabel}>
                        {t('workspace_settings_templates_modal.default_labels')}
                    </p>
                    {labels.length === 0 ? (
                        <p className="text-xs text-(--text-gray-color)">
                            {t('workspace_settings_templates_modal.no_labels')}
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
                                    onClick={() => toggleLabel(label.name)}
                                    className={cn(
                                        'cursor-pointer rounded-full border-none bg-transparent p-0 transition-opacity',
                                        !defaultLabels.includes(label.name) &&
                                            'opacity-40',
                                    )}
                                >
                                    <LabelBadge label={label.name} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stays at the bottom edge while a long description scrolls. Opaque
                (the surface colour is a see-through tint), or the text
                scrolling under it shows through as a glow. */}
            <div className="sticky bottom-0 z-20 -mx-4 -mb-4 flex items-center justify-end gap-2 rounded-b-xl border-t border-(--border-color) bg-(--bg-color) px-4 py-3">
                <Button
                    type="button"
                    isBox
                    onClick={closeForm}
                    className="min-h-10 px-4 text-(--text-gray-color) sm:min-h-8"
                >
                    {t('common.cancel')}
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    isDisabled={!name.trim()}
                    className="min-h-10 px-4 sm:min-h-8"
                >
                    {isEditing
                        ? t('workspace_settings_templates_modal.save_changes')
                        : t('workspace_settings_templates_modal.add')}
                </Button>
            </div>
        </div>
    );

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

                {/* The scroller has no padding of its own: a sticky bar sticks
                    to the edge of the padding-free box, so with padding here
                    the formatting bar would stop short of the top and let
                    the text scroll past above it. */}
                <div className="max-h-[75vh] overflow-y-auto">
                    <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <p className="min-w-0 flex-1 basis-64 text-xs leading-relaxed text-(--text-gray-color)">
                                {t('workspace_settings_templates_modal.intro', {
                                    type: issueType.name,
                                })}
                            </p>
                            {canManageTemplates && !isFormOpen && (
                                <button
                                    type="button"
                                    onClick={startCreating}
                                    className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-(--border-color) bg-transparent px-3 py-1.5 text-xs font-medium text-(--text-color) transition-colors hover:bg-(--bg-light-color)"
                                >
                                    <Icon name="Plus" size={13} />
                                    {t(
                                        'workspace_settings_templates_modal.new',
                                    )}
                                </button>
                            )}
                        </div>

                        {canManageTemplates && isComposing && form}

                        {templates.length === 0 && !isFormOpen ? (
                            <p className="rounded-xl border border-dashed border-(--border-color) px-3.5 py-6 text-center text-xs text-(--text-gray-color)">
                                {t('workspace_settings_templates_modal.empty')}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {templates.map((template, index) =>
                                    canManageTemplates &&
                                    editingId === template.id ? (
                                        <div key={template.id}>{form}</div>
                                    ) : (
                                        <div
                                            key={template.id}
                                            className="rounded-xl border border-(--border-color) bg-(--surface-color) p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <p className="truncate text-sm font-semibold text-(--text-color)">
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
                                                                            ) ??
                                                                            '',
                                                                    },
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {template.defaultLabels
                                                        .length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                                            {template.defaultLabels.map(
                                                                (label) => (
                                                                    <LabelBadge
                                                                        key={
                                                                            label
                                                                        }
                                                                        label={
                                                                            label
                                                                        }
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
                                                                startEditing(
                                                                    template,
                                                                )
                                                            }
                                                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color) pointer-coarse:h-10 pointer-coarse:w-10"
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
                                                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-(--text-gray-color) transition-colors hover:bg-(--error-color)/10 hover:text-(--error-color) pointer-coarse:h-10 pointer-coarse:w-10"
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
                                                // Rendered as it will look on the
                                                // issue, not as raw markdown.
                                                <div
                                                    className={cn(
                                                        'relative mt-3 max-h-44 overflow-hidden rounded-lg border border-(--border-color) bg-(--bg-color) px-3 py-2',
                                                    )}
                                                >
                                                    <EditableMarkdown
                                                        value={
                                                            template.description
                                                        }
                                                        disabled
                                                    />
                                                    {isLong(
                                                        template.description,
                                                    ) && (
                                                        <div
                                                            aria-hidden="true"
                                                            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-(--bg-color) to-transparent"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </ProjectLabelsProvider>
    );
}
