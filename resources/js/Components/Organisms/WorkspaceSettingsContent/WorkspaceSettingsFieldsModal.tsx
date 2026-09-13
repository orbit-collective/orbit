import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueFieldType, IssueType, IssueTypeField } from '@/types/IssueTypes';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import { icons } from 'lucide-react';
import { useState } from 'react';

interface WorkspaceSettingsFieldsModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    issueType: IssueType | null;
    canManageFields?: boolean;
}

const FIELD_TYPE_OPTIONS: {
    value: IssueFieldType;
    label: string;
    icon: keyof typeof icons;
}[] = [
    { value: 'text', label: 'Short text', icon: 'Type' },
    { value: 'textarea', label: 'Long text', icon: 'TextAlignStart' },
    { value: 'number', label: 'Number', icon: 'Hash' },
    { value: 'date', label: 'Date', icon: 'Calendar' },
    { value: 'select', label: 'Choice', icon: 'List' },
    { value: 'checkbox', label: 'Checkbox', icon: 'SquareCheck' },
    { value: 'url', label: 'Link', icon: 'Link' },
];

const typeMeta = (type: IssueFieldType) =>
    FIELD_TYPE_OPTIONS.find((option) => option.value === type);

export default function WorkspaceSettingsFieldsModal({
    isOpen,
    onClose,
    projectId,
    issueType,
    canManageFields = false,
}: WorkspaceSettingsFieldsModalProps) {
    const { addAlert } = useAlert();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [label, setLabel] = useState('');
    const [type, setType] = useState<IssueFieldType>('text');
    const [options, setOptions] = useState('');
    const [placeholder, setPlaceholder] = useState('');
    const [isRequired, setIsRequired] = useState(false);

    if (!issueType) return null;

    const fields = issueType.fields ?? [];
    const isEditing = editingId !== null;
    const isFormOpen = isComposing || isEditing;

    const closeForm = () => {
        setEditingId(null);
        setIsComposing(false);
        setLabel('');
        setType('text');
        setOptions('');
        setPlaceholder('');
        setIsRequired(false);
    };

    const startCreating = () => {
        closeForm();
        setIsComposing(true);
    };

    const startEditing = (field: IssueTypeField) => {
        setIsComposing(false);
        setEditingId(field.id);
        setLabel(field.label);
        setType(field.type);
        setOptions(field.options.join(', '));
        setPlaceholder(field.placeholder ?? '');
        setIsRequired(field.isRequired);
    };

    const handleSave = () => {
        const trimmed = label.trim();
        if (!trimmed) return;

        const payload = {
            label: trimmed,
            type,
            placeholder: placeholder.trim() || null,
            is_required: isRequired,
            options:
                type === 'select'
                    ? options
                          .split(',')
                          .map((option) => option.trim())
                          .filter(Boolean)
                    : [],
        };

        const requestOptions = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: closeForm,
            onError: () => addAlert('Could not save this field.', 'error'),
        };

        if (isEditing) {
            router.patch(
                route('projects.issue-types.fields.update', [
                    projectId,
                    issueType.id,
                    editingId,
                ]),
                payload,
                requestOptions,
            );
            return;
        }

        router.post(
            route('projects.issue-types.fields.store', [
                projectId,
                issueType.id,
            ]),
            payload,
            requestOptions,
        );
    };

    const handleDelete = (fieldId: number) => {
        router.delete(
            route('projects.issue-types.fields.destroy', [
                projectId,
                issueType.id,
                fieldId,
            ]),
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: closeForm,
                onError: () =>
                    addAlert('Could not remove this field.', 'error'),
            },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalHeader
                title={`${issueType.name} fields`}
                onClose={onClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon name="ListChecks" size={16} />
                    </span>
                }
            />

            <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-6">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-[var(--text-gray-color)]">
                        Extra fields shown on every {issueType.name}, on top of
                        the built-in title, description, assignee, labels,
                        priority and dates.
                    </p>
                    {canManageFields && !isFormOpen && (
                        <button
                            type="button"
                            onClick={startCreating}
                            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-2 py-1 text-xs font-medium text-[var(--text-muted-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                        >
                            <Icon name="Plus" size={13} />
                            New field
                        </button>
                    )}
                </div>

                {fields.length === 0 && !isFormOpen ? (
                    <p className="rounded-xl border border-dashed border-[var(--border-color)] px-3.5 py-6 text-center text-xs text-[var(--text-gray-color)]">
                        No extra fields yet.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {fields.map((field) => {
                            const meta = typeMeta(field.type);

                            return (
                                <div
                                    key={field.id}
                                    className={cn(
                                        'flex items-start justify-between gap-3 rounded-xl border bg-[var(--surface-color)] px-3.5 py-3 transition-colors',
                                        editingId === field.id
                                            ? 'border-[var(--accent-color)]'
                                            : 'border-[var(--border-color)]',
                                    )}
                                >
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--bg-color)] text-[var(--text-muted-color)]">
                                        <Icon
                                            name={meta?.icon ?? 'Type'}
                                            size={13}
                                        />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                                {field.label}
                                            </p>
                                            {field.isRequired && (
                                                <span className="rounded-full border border-[var(--accent-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-color)]">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-[var(--text-gray-color)]">
                                            {meta?.label ?? field.type}
                                            {field.placeholder
                                                ? ` · ${field.placeholder}`
                                                : ''}
                                        </p>
                                        {field.options.length > 0 && (
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {field.options.map((option) => (
                                                    <span
                                                        key={option}
                                                        className="rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]"
                                                    >
                                                        {option}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {canManageFields && (
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                title="Edit field"
                                                aria-label={`Edit ${field.label}`}
                                                onClick={() =>
                                                    startEditing(field)
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                                            >
                                                <Icon name="Pencil" size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                title="Delete field"
                                                aria-label={`Delete ${field.label}`}
                                                onClick={() =>
                                                    handleDelete(field.id)
                                                }
                                                className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                            >
                                                <Icon name="Trash" size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {canManageFields && isFormOpen && (
                    <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
                        <h4 className="text-sm font-semibold text-[var(--text-color)]">
                            {isEditing ? 'Edit field' : 'New field'}
                        </h4>

                        <Input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Field label"
                            variant="modal"
                        />

                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                Field type
                            </p>
                            <div data-testid="new-field-type">
                                <InlineSelectDropdown
                                    label="Field type"
                                    placeholder="Field type"
                                    options={FIELD_TYPE_OPTIONS}
                                    value={type}
                                    onChange={(value) =>
                                        value &&
                                        setType(value as IssueFieldType)
                                    }
                                    subtle
                                />
                            </div>
                        </div>

                        {type === 'select' && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                    Choices
                                </p>
                                <Input
                                    value={options}
                                    onChange={(e) => setOptions(e.target.value)}
                                    placeholder="Low, Medium, High"
                                    variant="modal"
                                />
                            </div>
                        )}

                        {type !== 'checkbox' && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                    Hint
                                </p>
                                <Input
                                    value={placeholder}
                                    onChange={(e) =>
                                        setPlaceholder(e.target.value)
                                    }
                                    placeholder="Shown while the field is empty (optional)"
                                    variant="modal"
                                />
                            </div>
                        )}

                        <Checkbox
                            checked={isRequired}
                            onChange={(e) => setIsRequired(e.target.checked)}
                            label="Required before an issue of this type can be saved"
                        />

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
                                disabled={!label.trim()}
                                className="rounded-md bg-[var(--accent-color)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isEditing ? 'Save changes' : 'Add field'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
