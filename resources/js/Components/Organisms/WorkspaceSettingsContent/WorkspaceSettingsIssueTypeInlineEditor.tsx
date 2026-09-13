import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import Modal from '@/Components/Atoms/Modal/Modal';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import ModalFooter from '@/Components/Molecules/ModalFooter/ModalFooter';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
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
        is_top_level: boolean;
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
    const [isTopLevel, setIsTopLevel] = useState(issueType?.isTopLevel ?? true);
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
            is_top_level: isTopLevel,
            required_fields: requiredFields,
            restricted_role_types: restrictedRoleTypes,
        });
    };

    return (
        <Modal isOpen onClose={onCancel} size="lg">
            <ModalHeader
                title={isEditing ? 'Edit issue type' : 'New issue type'}
                onClose={onCancel}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon
                            name={isEditing ? 'Pencil' : 'Sparkles'}
                            size={16}
                        />
                    </span>
                }
            />

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
                <div className="flex flex-col gap-8 md:flex-row">
                    <div className="flex flex-1 flex-col gap-5">
                        <div className="space-y-3">
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
                                onChange={(e) =>
                                    setAllowsChildren(e.target.checked)
                                }
                                label="Allows sub-issues (like an Epic)"
                            />
                            <Checkbox
                                checked={isTopLevel}
                                onChange={(e) =>
                                    setIsTopLevel(e.target.checked)
                                }
                                label="Can be created on its own (otherwise sub-issue only)"
                            />
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-[var(--text-color)]">
                                Required fields
                            </h4>
                            <p className="text-xs text-[var(--text-gray-color)]">
                                Fields that must be filled in before an issue of
                                this type can be created.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
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

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-[var(--text-color)]">
                                Who can create this type
                            </h4>
                            <p className="text-xs text-[var(--text-gray-color)]">
                                Leave everything unchecked to allow anyone who
                                can create issues.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {ROLE_TYPE_OPTIONS.map((option) => (
                                    <Checkbox
                                        key={option.value}
                                        checked={restrictedRoleTypes.includes(
                                            option.value,
                                        )}
                                        onChange={() =>
                                            toggleRestrictedRoleType(
                                                option.value,
                                            )
                                        }
                                        label={option.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-5">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-[var(--text-color)]">
                                Color
                            </h4>
                            <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border-color)] p-3">
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
                            <h4 className="text-sm font-semibold text-[var(--text-color)]">
                                Icon
                            </h4>
                            <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-color)] p-3">
                                {ISSUE_TYPE_ICON_OPTIONS.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setIcon(option)}
                                        aria-label={`Use icon ${option}`}
                                        className={cn(
                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors',
                                            icon === option
                                                ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)] text-[var(--accent-color)]'
                                                : 'border-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)]',
                                        )}
                                    >
                                        <Icon name={option} size={15} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-[var(--text-color)]">
                                Preview
                            </h4>
                            <div className="rounded-xl border border-[var(--border-color)] p-4">
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
                </div>
            </div>

            <ModalFooter onCancel={onCancel}>
                <button
                    type="button"
                    onClick={onCancel}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!trimmedName}
                    className="cursor-pointer rounded-lg bg-[var(--accent-color)] px-6 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isEditing ? 'Save changes' : 'Create issue type'}
                </button>
            </ModalFooter>
        </Modal>
    );
}
