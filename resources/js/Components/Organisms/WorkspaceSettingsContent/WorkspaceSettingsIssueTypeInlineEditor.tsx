import Button from '@/Components/Atoms/Button/Button';
import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import { IssueType } from '@/types/IssueTypes';
import { cn } from '@/utils/cn';
import { ISSUE_TYPE_ICON_OPTIONS } from '@/utils/issueTypeIcons';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';
import { useState } from 'react';

const REQUIRED_FIELD_OPTIONS: { value: string; label: string }[] = [
    { value: 'description', label: 'Description' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'labels', label: 'Labels' },
    { value: 'start_date', label: 'Start date' },
    { value: 'end_date', label: 'End date' },
    { value: 'priority', label: 'Priority' },
];

const ROLE_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
    { value: 'viewer', label: 'Viewer' },
];

interface WorkspaceSettingsIssueTypeInlineEditorProps {
    issueType: IssueType | null;
    onSave: (values: {
        name: string;
        icon: string;
        color: string;
        description: string;
        allows_children: boolean;
        required_fields: string[];
        restricted_role_types: string[];
    }) => void;
    onCancel: () => void;
}

export default function WorkspaceSettingsIssueTypeInlineEditor({
    issueType,
    onSave,
    onCancel,
}: WorkspaceSettingsIssueTypeInlineEditorProps) {
    const [name, setName] = useState(issueType?.name ?? '');
    const [description, setDescription] = useState(
        issueType?.description ?? '',
    );
    const [color, setColor] = useState(
        issueType?.color ?? LABEL_COLOR_PALETTE[0],
    );
    const [icon, setIcon] = useState(
        issueType?.icon ?? ISSUE_TYPE_ICON_OPTIONS[0],
    );
    const [allowsChildren, setAllowsChildren] = useState(
        issueType?.allowsChildren ?? false,
    );
    const [requiredFields, setRequiredFields] = useState<string[]>(
        issueType?.requiredFields ?? [],
    );
    const [restrictedRoleTypes, setRestrictedRoleTypes] = useState<string[]>(
        issueType?.restrictedRoleTypes ?? [],
    );

    const isEditing = issueType !== null;
    const trimmedName = name.trim();

    const toggleRequiredField = (field: string) => {
        setRequiredFields((current) =>
            current.includes(field)
                ? current.filter((f) => f !== field)
                : [...current, field],
        );
    };

    const toggleRestrictedRoleType = (role: string) => {
        setRestrictedRoleTypes((current) =>
            current.includes(role)
                ? current.filter((r) => r !== role)
                : [...current, role],
        );
    };

    const handleSave = () => {
        if (!trimmedName) return;
        onSave({
            name: trimmedName,
            icon,
            color,
            description: description.trim(),
            allows_children: allowsChildren,
            required_fields: requiredFields,
            restricted_role_types: restrictedRoleTypes,
        });
    };

    return (
        <div className="border-[var(--accent-color)]/40 mx-4 my-3 space-y-4 rounded-xl border bg-[var(--accent-color-opacity)] p-4 sm:mx-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-color)]">
                <Icon name={isEditing ? 'Pencil' : 'Sparkles'} size={13} />
                {isEditing ? 'Editing issue type' : 'New issue type'}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex flex-1 flex-col gap-3">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Issue type name"
                        variant="modal"
                        autoComplete="off"
                    />
                    <TextArea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this issue type used for? (optional)"
                        variant="modal"
                        className="min-h-[56px]"
                    />
                    <Checkbox
                        checked={allowsChildren}
                        onChange={(e) => setAllowsChildren(e.target.checked)}
                        label="Allows sub-issues (like an Epic)"
                    />

                    <div className="space-y-1.5">
                        <span className="text-xs font-medium text-[var(--text-gray-color)]">
                            Required fields
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                            {REQUIRED_FIELD_OPTIONS.map((option) => (
                                <Checkbox
                                    key={option.value}
                                    checked={requiredFields.includes(
                                        option.value,
                                    )}
                                    onChange={() =>
                                        toggleRequiredField(option.value)
                                    }
                                    label={option.label}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-xs font-medium text-[var(--text-gray-color)]">
                            Who can create this type
                        </span>
                        <p className="text-xs text-[var(--text-gray-color)]">
                            Leave everything unchecked to allow anyone who can
                            create issues.
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {ROLE_TYPE_OPTIONS.map((option) => (
                                <Checkbox
                                    key={option.value}
                                    checked={restrictedRoleTypes.includes(
                                        option.value,
                                    )}
                                    onChange={() =>
                                        toggleRestrictedRoleType(option.value)
                                    }
                                    label={option.label}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                    <div className="space-y-2">
                        <span className="text-xs font-medium text-[var(--text-gray-color)]">
                            Color
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {LABEL_COLOR_PALETTE.map((swatch) => (
                                <button
                                    key={swatch}
                                    type="button"
                                    onClick={() => setColor(swatch)}
                                    aria-label={`Use color ${swatch}`}
                                    className={cn(
                                        'h-6 w-6 shrink-0 rounded-full border transition-transform',
                                        color === swatch
                                            ? 'scale-110 border-white'
                                            : 'border-transparent hover:scale-110',
                                    )}
                                    style={{ backgroundColor: swatch }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-medium text-[var(--text-gray-color)]">
                            Icon
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {ISSUE_TYPE_ICON_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setIcon(option)}
                                    aria-label={`Use icon ${option}`}
                                    className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                                        icon === option
                                            ? 'border-[var(--accent-color)] bg-[var(--bg-color)] text-[var(--accent-color)]'
                                            : 'border-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-color)]',
                                    )}
                                >
                                    <Icon name={option} size={14} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <span className="mb-1 block text-xs font-medium text-[var(--text-gray-color)]">
                            Preview
                        </span>
                        <IssueTypeBadge
                            issueType={{
                                name: trimmedName || 'Issue type name',
                                icon,
                                color,
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-[var(--text-gray-color)] transition-colors hover:text-[var(--text-color)]"
                >
                    Cancel
                </button>
                <Button
                    type="button"
                    onClick={handleSave}
                    isDisabled={!trimmedName}
                >
                    {isEditing ? 'Save changes' : 'Create issue type'}
                </Button>
            </div>
        </div>
    );
}
