import { useId, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import AppearancePicker from '@/Components/Molecules/AppearancePicker/AppearancePicker';
import InlineEditRow, {
    inlineFieldClass,
} from '@/Components/Molecules/InlineEditRow/InlineEditRow';
import { ProjectPriority } from '@/types/Priorities';
import { cn } from '@/utils/cn';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';
import {
    DEFAULT_PRIORITY_ICON,
    PRIORITY_ICON_OPTIONS,
    resolvePriorityIcon,
} from '@/utils/priorityIcons';

export type PriorityFormValues = {
    name: string;
    color: string;
    icon: string;
    is_default: boolean;
};

interface WorkspaceSettingsPriorityInlineEditorProps {
    priority: ProjectPriority | null;
    /** What the server objected to, keyed by field (e.g. a duplicate name). */
    errors?: Partial<Record<keyof PriorityFormValues, string>>;
    /** A save is in flight: the row cannot be submitted again. */
    saving?: boolean;
    onSave: (values: PriorityFormValues) => void;
    onCancel: () => void;
}

const NEW_PRIORITY_COLOR = '#2196f3';
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** A priority row in edit mode: icon and color, name, and the default star on one line. */
export default function WorkspaceSettingsPriorityInlineEditor({
    priority,
    errors = {},
    saving = false,
    onSave,
    onCancel,
}: WorkspaceSettingsPriorityInlineEditorProps) {
    const errorId = useId();
    const [name, setName] = useState(priority?.name ?? '');
    const [color, setColor] = useState(priority?.color ?? NEW_PRIORITY_COLOR);
    const [icon, setIcon] = useState(priority?.icon ?? DEFAULT_PRIORITY_ICON);
    const [isDefault, setIsDefault] = useState(priority?.isDefault ?? false);

    const isEditing = priority !== null;
    const isCurrentDefault = priority?.isDefault ?? false;
    const trimmedName = name.trim();
    const canSave = !saving && trimmedName !== '' && HEX_COLOR.test(color);

    const handleSave = () => {
        if (!canSave) return;
        onSave({ name: trimmedName, color, icon, is_default: isDefault });
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
                    iconOptions={PRIORITY_ICON_OPTIONS}
                    ariaLabel="Priority icon and color"
                >
                    <Icon
                        name={resolvePriorityIcon(icon)}
                        size={17}
                        color={color}
                    />
                </AppearancePicker>
            }
            extras={
                <button
                    type="button"
                    aria-pressed={isDefault}
                    aria-label="Default for new issues"
                    // The default only ever moves to another priority; it is
                    // never switched off on its own.
                    disabled={isCurrentDefault}
                    title={
                        isCurrentDefault
                            ? 'The default for new issues - make another priority the default to change it'
                            : 'Use as the default for new issues'
                    }
                    onClick={() => setIsDefault((current) => !current)}
                    className={cn(
                        'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
                        isDefault
                            ? 'bg-[var(--warning-color)]/15 text-[var(--warning-color)]'
                            : 'cursor-pointer text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                        isCurrentDefault && 'cursor-default',
                    )}
                >
                    <Icon name="Star" size={13} />
                    <span className="hidden sm:inline">Default</span>
                </button>
            }
            canSave={canSave}
            saveLabel={isEditing ? 'Save priority' : 'Create priority'}
            error={errors.name ?? errors.is_default}
            errorId={errorId}
            onSave={handleSave}
            onCancel={onCancel}
        >
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priority name"
                aria-label="Priority name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? errorId : undefined}
                autoComplete="off"
                maxLength={50}
                className={cn(inlineFieldClass, 'font-medium sm:flex-1')}
            />
        </InlineEditRow>
    );
}
