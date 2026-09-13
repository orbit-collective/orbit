import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import EditableText from '@/Components/Atoms/EditableText/EditableText';
import { IssueTypeField } from '@/types/IssueTypes';
import { useState } from 'react';

interface IssueCustomFieldProps {
    field: IssueTypeField;
    value: string | number | boolean | null;
    onSave: (value: string | number | boolean | null) => void;
    disabled?: boolean;
}

/**
 * One user-defined field on an issue's sidebar. Each shape saves as soon as
 * it settles - text on blur/enter via EditableText, the rest on change -
 * matching how the built-in sidebar fields already behave.
 */
export default function IssueCustomField({
    field,
    value,
    onSave,
    disabled = false,
}: IssueCustomFieldProps) {
    const [draft, setDraft] = useState(value === null ? '' : String(value));

    const emptyText = field.placeholder ?? `Add ${field.label.toLowerCase()}`;

    if (field.type === 'checkbox') {
        return (
            <Checkbox
                checked={value === true}
                isDisabled={disabled}
                onChange={(e) => onSave(e.target.checked)}
                label={field.label}
            />
        );
    }

    if (field.type === 'select') {
        return (
            <div className="flex flex-wrap gap-1.5">
                {field.options.map((option) => {
                    const isSelected = value === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            disabled={disabled}
                            aria-pressed={isSelected}
                            onClick={() => onSave(isSelected ? null : option)}
                            className={
                                isSelected
                                    ? 'rounded-full border border-[var(--accent-color)] bg-[var(--accent-color-opacity)] px-2 py-0.5 text-xs font-medium text-[var(--accent-color)]'
                                    : 'rounded-full border border-[var(--border-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)]'
                            }
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
        );
    }

    if (field.type === 'date' || field.type === 'number') {
        return (
            <input
                type={field.type}
                value={draft}
                disabled={disabled}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => onSave(draft === '' ? null : draft)}
                aria-label={field.label}
                placeholder={field.placeholder ?? undefined}
                className="w-full rounded-md border border-[var(--border-color)] bg-transparent px-2 py-1 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)] disabled:opacity-60"
            />
        );
    }

    return (
        <EditableText
            value={value === null ? '' : String(value)}
            onSave={(next) => onSave(next.trim() === '' ? null : next)}
            multiline={field.type === 'textarea'}
            disabled={disabled}
            placeholder={emptyText}
            emptyText={emptyText}
            displayClassName="text-sm text-[var(--text-color)]"
        />
    );
}
