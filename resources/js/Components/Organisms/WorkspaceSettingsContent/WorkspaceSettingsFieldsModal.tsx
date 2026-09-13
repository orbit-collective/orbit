import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { IssueFieldType, IssueType } from '@/types/IssueTypes';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface WorkspaceSettingsFieldsModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    issueType: IssueType | null;
    canManageFields?: boolean;
}

const FIELD_TYPE_OPTIONS: { value: IssueFieldType; label: string }[] = [
    { value: 'text', label: 'Short text' },
    { value: 'textarea', label: 'Long text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Choice' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'url', label: 'Link' },
];

const typeLabel = (type: IssueFieldType) =>
    FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;

export default function WorkspaceSettingsFieldsModal({
    isOpen,
    onClose,
    projectId,
    issueType,
    canManageFields = false,
}: WorkspaceSettingsFieldsModalProps) {
    const { addAlert } = useAlert();
    const [label, setLabel] = useState('');
    const [type, setType] = useState<IssueFieldType>('text');
    const [options, setOptions] = useState('');
    const [isRequired, setIsRequired] = useState(false);

    if (!issueType) return null;

    const fields = issueType.fields ?? [];

    const resetForm = () => {
        setLabel('');
        setType('text');
        setOptions('');
        setIsRequired(false);
    };

    const handleAdd = () => {
        const trimmed = label.trim();
        if (!trimmed) return;

        router.post(
            route('projects.issue-types.fields.store', [
                projectId,
                issueType.id,
            ]),
            {
                label: trimmed,
                type,
                is_required: isRequired,
                options:
                    type === 'select'
                        ? options
                              .split(',')
                              .map((option) => option.trim())
                              .filter(Boolean)
                        : [],
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: resetForm,
                onError: () => addAlert('Could not add this field.', 'error'),
            },
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
                <p className="text-xs text-[var(--text-gray-color)]">
                    Extra fields shown on every issue of this type, on top of
                    the built-in title, description, assignee, labels, priority
                    and dates.
                </p>

                {fields.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--border-color)] px-3.5 py-6 text-center text-xs text-[var(--text-gray-color)]">
                        No extra fields yet.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {fields.map((field) => (
                            <div
                                key={field.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] px-3.5 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                        {field.label}
                                    </p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-gray-color)]">
                                        <span>{typeLabel(field.type)}</span>
                                        {field.isRequired && (
                                            <span className="rounded-full border border-[var(--accent-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-color)]">
                                                Required
                                            </span>
                                        )}
                                        {field.options.length > 0 && (
                                            <span className="truncate">
                                                {field.options.join(' · ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {canManageFields && (
                                    <button
                                        type="button"
                                        title="Delete field"
                                        aria-label={`Delete ${field.label}`}
                                        onClick={() => handleDelete(field.id)}
                                        className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                    >
                                        <Icon name="Trash" size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {canManageFields && (
                    <div className="space-y-3 rounded-xl border border-dashed border-[var(--border-color)] p-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="New field label"
                                variant="modal"
                                className="max-w-[200px]"
                            />
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
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={!label.trim()}
                                className="ml-auto rounded-md bg-[var(--accent-color)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Add field
                            </button>
                        </div>

                        {type === 'select' && (
                            <Input
                                value={options}
                                onChange={(e) => setOptions(e.target.value)}
                                placeholder="Choices, comma separated"
                                variant="modal"
                            />
                        )}

                        <Checkbox
                            checked={isRequired}
                            onChange={(e) => setIsRequired(e.target.checked)}
                            label="Required before an issue of this type can be saved"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}
