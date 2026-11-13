import { useLaravelReactI18n } from 'laravel-react-i18n';
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
    const { t } = useLaravelReactI18n();
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
                    ariaLabel={t(
                        'workspace_settings_priorities.editor.appearance_aria',
                    )}
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
                    aria-label={t(
                        'workspace_settings_priorities.editor.default_aria',
                    )}
                    // The default only ever moves to another priority; it is
                    // never switched off on its own.
                    disabled={isCurrentDefault}
                    title={
                        isCurrentDefault
                            ? t(
                                  'workspace_settings_priorities.editor.default_current_hint',
                              )
                            : t(
                                  'workspace_settings_priorities.editor.default_hint',
                              )
                    }
                    onClick={() => setIsDefault((current) => !current)}
                    className={cn(
                        'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
                        isDefault
                            ? 'bg-(--warning-color)/15 text-(--warning-color)'
                            : 'cursor-pointer text-(--text-gray-color) hover:bg-(--bg-light-color) hover:text-(--text-color)',
                        isCurrentDefault && 'cursor-default',
                    )}
                >
                    <Icon name="Star" size={13} />
                    <span className="hidden sm:inline">
                        {t('workspace_settings_priorities.editor.default')}
                    </span>
                </button>
            }
            canSave={canSave}
            saveLabel={
                isEditing
                    ? t('workspace_settings_priorities.editor.save')
                    : t('workspace_settings_priorities.editor.create')
            }
            error={errors.name ?? errors.is_default}
            errorId={errorId}
            onSave={handleSave}
            onCancel={onCancel}
        >
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                    'workspace_settings_priorities.editor.name_placeholder',
                )}
                aria-label={t('workspace_settings_priorities.editor.name_aria')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? errorId : undefined}
                autoComplete="off"
                maxLength={50}
                className={cn(inlineFieldClass, 'font-medium sm:flex-1')}
            />
        </InlineEditRow>
    );
}
