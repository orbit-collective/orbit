import { useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import { ProjectPriority } from '@/types/Priorities';
import { cn } from '@/utils/cn';
import {
    PRIORITY_COLOR_OPTIONS,
    PRIORITY_ICON_OPTIONS,
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
    onSave: (values: PriorityFormValues) => void;
    onCancel: () => void;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export default function WorkspaceSettingsPriorityInlineEditor({
    priority,
    errors = {},
    onSave,
    onCancel,
}: WorkspaceSettingsPriorityInlineEditorProps) {
    const [name, setName] = useState(priority?.name ?? '');
    const [color, setColor] = useState<string>(
        priority?.color ?? PRIORITY_COLOR_OPTIONS[0],
    );
    const [icon, setIcon] = useState<string>(
        priority?.icon ?? PRIORITY_ICON_OPTIONS[0],
    );
    const [isDefault, setIsDefault] = useState(priority?.isDefault ?? false);

    const isEditing = priority !== null;
    const trimmedName = name.trim();
    const canSave = trimmedName !== '' && HEX_COLOR.test(color);

    const handleSave = () => {
        if (!canSave) return;
        onSave({ name: trimmedName, color, icon, is_default: isDefault });
    };

    return (
        <div className="border-[var(--accent-color)]/40 mx-4 my-3 space-y-4 rounded-xl border bg-[var(--accent-color-opacity)] p-4 sm:mx-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-color)]">
                <Icon name={isEditing ? 'Pencil' : 'Sparkles'} size={13} />
                {isEditing ? 'Editing priority' : 'New priority'}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex flex-1 flex-col gap-3">
                    <div className="space-y-1">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Priority name"
                            variant="modal"
                            autoComplete="off"
                        />
                        {errors.name && (
                            <p
                                role="alert"
                                className="text-xs text-[var(--error-color)]"
                            >
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-[var(--text-gray-color)]">
                            Color
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {PRIORITY_COLOR_OPTIONS.map((swatch) => (
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
                            <input
                                type="color"
                                value={
                                    HEX_COLOR.test(color) ? color : '#000000'
                                }
                                onChange={(e) => setColor(e.target.value)}
                                aria-label="Pick a custom color"
                                className="h-6 w-8 cursor-pointer rounded border border-[var(--border-color)] bg-transparent p-0"
                            />
                        </div>
                    </div>

                    <Checkbox
                        id="priority-is-default"
                        checked={isDefault}
                        // The default can only move to another priority, never be
                        // switched off on its own.
                        isDisabled={priority?.isDefault ?? false}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        label="Default for new issues"
                    />
                </div>

                <div className="flex flex-1 flex-col gap-3">
                    <span className="text-xs font-medium text-[var(--text-gray-color)]">
                        Icon
                    </span>
                    <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-color)] p-3">
                        {PRIORITY_ICON_OPTIONS.map((option) => (
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
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-color)]">
                        <PriorityIcon
                            priority={{
                                name: trimmedName,
                                icon,
                                color: HEX_COLOR.test(color)
                                    ? color
                                    : '#000000',
                            }}
                            tooltip={false}
                        />
                        {trimmedName || 'priority name'}
                    </span>
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
                    isDisabled={!canSave}
                >
                    {isEditing ? 'Save changes' : 'Create priority'}
                </Button>
            </div>
        </div>
    );
}
