import { icons } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import AppearancePicker from '@/Components/Molecules/AppearancePicker/AppearancePicker';
import InlineEditRow, {
    inlineFieldClass,
} from '@/Components/Molecules/InlineEditRow/InlineEditRow';
import ToggleChip from '@/Components/Molecules/ToggleChip/ToggleChip';
import { IssueType } from '@/types/IssueTypes';
import { cn } from '@/utils/cn';
import { ISSUE_TYPE_ICON_OPTIONS } from '@/utils/issueTypeIcons';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';

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

export type IssueTypeFormValues = {
    name: string;
    icon: string;
    color: string;
    description: string;
    allows_children: boolean;
    is_top_level: boolean;
    required_fields: string[];
    restricted_role_types: string[];
};

interface WorkspaceSettingsIssueTypeInlineEditorProps {
    issueType: IssueType | null;
    onSave: (values: IssueTypeFormValues) => void;
    onCancel: () => void;
}

const toggled = (list: string[], value: string) =>
    list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];

/** One labelled line of chips under the fields. */
function OptionGroup({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center gap-1.5" title={hint}>
            <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                {label}
            </span>
            {children}
        </div>
    );
}

/** An issue type row in edit mode: look, name and description on one line, its rules as chips below. */
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
    const [icon, setIcon] = useState<string>(
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
        <InlineEditRow
            leading={
                <AppearancePicker
                    color={color}
                    onColorChange={setColor}
                    palette={LABEL_COLOR_PALETTE}
                    icon={icon}
                    onIconChange={setIcon}
                    iconOptions={ISSUE_TYPE_ICON_OPTIONS}
                    ariaLabel="Issue type icon and color"
                >
                    <Icon
                        name={icon as keyof typeof icons}
                        size={17}
                        color={color}
                    />
                </AppearancePicker>
            }
            canSave={trimmedName !== ''}
            saveLabel={isEditing ? 'Save issue type' : 'Create issue type'}
            onSave={handleSave}
            onCancel={onCancel}
            below={
                <>
                    <OptionGroup label="Hierarchy">
                        <ToggleChip
                            label="Allows sub-issues"
                            pressed={allowsChildren}
                            onClick={() =>
                                setAllowsChildren((current) => !current)
                            }
                        />
                        <ToggleChip
                            label="Can be created on its own"
                            pressed={isTopLevel}
                            onClick={() => setIsTopLevel((current) => !current)}
                        />
                    </OptionGroup>
                    <OptionGroup
                        label="Required"
                        hint="Fields that must be filled in before an issue of this type can be created."
                    >
                        {REQUIRED_FIELD_OPTIONS.map((option) => (
                            <ToggleChip
                                key={option.value}
                                label={option.label}
                                pressed={requiredFields.includes(option.value)}
                                onClick={() =>
                                    setRequiredFields((current) =>
                                        toggled(current, option.value),
                                    )
                                }
                            />
                        ))}
                    </OptionGroup>
                    <OptionGroup
                        label="Who can create"
                        hint="Leave everything off to allow anyone who can create issues."
                    >
                        {ROLE_TYPE_OPTIONS.map((option) => (
                            <ToggleChip
                                key={option.value}
                                label={option.label}
                                pressed={restrictedRoleTypes.includes(
                                    option.value,
                                )}
                                onClick={() =>
                                    setRestrictedRoleTypes((current) =>
                                        toggled(current, option.value),
                                    )
                                }
                            />
                        ))}
                        <span
                            className={cn(
                                'text-xs text-[var(--text-muted-color)]',
                                restrictedRoleTypes.length > 0 && 'hidden',
                            )}
                        >
                            Anyone who can create issues
                        </span>
                    </OptionGroup>
                </>
            }
        >
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Issue type name"
                aria-label="Issue type name"
                autoComplete="off"
                maxLength={50}
                className={cn(inlineFieldClass, 'font-medium sm:w-44')}
            />
            <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is it used for? (optional)"
                aria-label="Issue type description"
                autoComplete="off"
                className={cn(
                    inlineFieldClass,
                    'text-[var(--text-gray-color)] sm:flex-1',
                )}
            />
        </InlineEditRow>
    );
}
