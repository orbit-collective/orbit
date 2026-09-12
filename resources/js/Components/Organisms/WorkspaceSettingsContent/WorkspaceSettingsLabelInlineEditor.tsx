import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import { WorkspaceLabelDefinition } from '@/types/Settings';
import { LABEL_COLOR_PALETTE } from '@/utils/labelColors';
import { useState } from 'react';

interface WorkspaceSettingsLabelInlineEditorProps {
    label: WorkspaceLabelDefinition | null;
    onSave: (values: {
        name: string;
        color: string;
        description: string;
    }) => void;
    onCancel: () => void;
}

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
        <div className="border-[var(--accent-color)]/40 mx-4 my-3 space-y-4 rounded-xl border bg-[var(--accent-color-opacity)] p-4 sm:mx-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-color)]">
                <Icon name={isEditing ? 'Pencil' : 'Sparkles'} size={13} />
                {isEditing ? 'Editing label' : 'New label'}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex flex-1 flex-col gap-3">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Label name"
                        variant="modal"
                        autoComplete="off"
                    />
                    <TextArea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What should this label be used for? (optional)"
                        variant="modal"
                        className="min-h-[56px]"
                    />
                </div>

                <div className="flex flex-1 flex-col gap-2">
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
                                className={`h-6 w-6 shrink-0 rounded-full border transition-transform ${
                                    color === swatch
                                        ? 'scale-110 border-white'
                                        : 'border-transparent hover:scale-110'
                                }`}
                                style={{ backgroundColor: swatch }}
                            />
                        ))}
                    </div>
                    <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-color)]">
                        <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        {trimmedName || 'label name'}
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
                    isDisabled={!trimmedName}
                >
                    {isEditing ? 'Save changes' : 'Create label'}
                </Button>
            </div>
        </div>
    );
}
