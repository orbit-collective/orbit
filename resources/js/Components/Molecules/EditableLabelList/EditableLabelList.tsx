import Icon from '@/Components/Atoms/Icon/Icon';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useProjectLabels } from '@/context/ProjectLabelsContext';
import { EditableLabelListProps } from '@/types/Components';
import { DropdownOptionItem } from '@/types/Dropdown';
import { IssueLabel } from '@/types/Issues';
import React, { useMemo } from 'react';

const EditableLabelList: React.FC<EditableLabelListProps> = ({
    labels,
    onSave,
    disabled = false,
}) => {
    const availableLabels = useProjectLabels().labels.map(
        (label) => label.name,
    );

    const options = useMemo(
        (): DropdownOptionItem[] =>
            availableLabels.map((label) => ({
                value: label,
                label: (
                    <LabelBadge label={label} className="pointer-events-none" />
                ),
                searchLabel: label,
            })),

        [availableLabels.join('\u0000')],
    );

    const toggleLabel = (label: IssueLabel) => {
        onSave(
            labels.includes(label)
                ? labels.filter((current) => current !== label)
                : [...labels, label],
        );
    };

    const allSelected =
        availableLabels.length > 0 &&
        availableLabels.every((label) => labels.includes(label));

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {labels.length === 0 && (
                <span className="text-sm text-[var(--text-gray-color)]">
                    None
                </span>
            )}
            {labels.map((label) => (
                <LabelBadge key={label} label={label} />
            ))}
            <Dropdown
                variant="multiselect"
                title="Labels"
                searchable
                searchPlaceholder="Change or add labels..."
                emptyMessage="No labels found."
                showCount
                options={options}
                selectedValues={labels}
                onSelect={(label) => toggleLabel(label)}
                onClear={() => onSave([])}
                onSelectAll={() =>
                    onSave(allSelected ? [] : [...availableLabels])
                }
                disabled={disabled}
                width={256}
                trigger={
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label="Edit labels"
                        className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <Icon name="Plus" size={12} />
                    </button>
                }
            />
        </div>
    );
};

export default EditableLabelList;
