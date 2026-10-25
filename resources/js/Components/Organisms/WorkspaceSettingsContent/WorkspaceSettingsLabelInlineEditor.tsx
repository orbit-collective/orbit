import { useState } from 'react';
import AppearancePicker from '@/Components/Molecules/AppearancePicker/AppearancePicker';
import InlineEditRow, {
    inlineFieldClass,
} from '@/Components/Molecules/InlineEditRow/InlineEditRow';
import { ProjectLabel } from '@/types/Labels';
import { cn } from '@/utils/cn';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';

interface WorkspaceSettingsLabelInlineEditorProps {
    label: ProjectLabel | null;
    onSave: (values: {
        name: string;
        color: string;
        description: string;
    }) => void;
    onCancel: () => void;
}

/** A label row in edit mode: color dot, name and description on one line. */
export default function WorkspaceSettingsLabelInlineEditor({
    label,
    onSave,
    onCancel,
}: WorkspaceSettingsLabelInlineEditorProps) {
    const [name, setName] = useState(label?.name ?? '');
    const [description, setDescription] = useState(label?.description ?? '');
    const [color, setColor] = useState(label?.color ?? LABEL_COLOR_PALETTE[0]);

    const isEditing = label !== null;
    const trimmedName = name.trim();

    const handleSave = () => {
        if (!trimmedName) return;
        onSave({ name: trimmedName, color, description: description.trim() });
    };

    return (
        <InlineEditRow
            leading={
                <AppearancePicker
                    color={color}
                    onColorChange={setColor}
                    palette={LABEL_COLOR_PALETTE}
                    ariaLabel="Label color"
                >
                    <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: color }}
                    />
                </AppearancePicker>
            }
            canSave={trimmedName !== ''}
            saveLabel={isEditing ? 'Save label' : 'Create label'}
            onSave={handleSave}
            onCancel={onCancel}
        >
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Label name"
                aria-label="Label name"
                autoComplete="off"
                maxLength={50}
                className={cn(inlineFieldClass, 'font-medium sm:w-44')}
            />
            <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                aria-label="Label description"
                autoComplete="off"
                maxLength={255}
                className={cn(
                    inlineFieldClass,
                    'text-[var(--text-gray-color)] sm:flex-1',
                )}
            />
        </InlineEditRow>
    );
}
