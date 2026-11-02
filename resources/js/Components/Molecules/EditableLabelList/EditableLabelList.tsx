import React, { useMemo } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { REVEAL_ON_ROW_HOVER } from '@/Components/Molecules/IssuePropertyPickers/IssuePropertyPickers';
import LabelList from '@/Components/Molecules/LabelList/LabelList';
import { useProjectLabels } from '@/context/ProjectLabelsContext';
import { EditableLabelListProps } from '@/types/Components';
import { DropdownOptionItem } from '@/types/Dropdown';
import { IssueLabel } from '@/types/Issues';
import { cn } from '@/utils/cn';

const EditableLabelList: React.FC<EditableLabelListProps> = ({
    labels,
    onSave,
    disabled = false,
    maxDisplay,
    revealTrigger = false,
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
        <div
            className={
                maxDisplay === undefined
                    ? 'flex flex-wrap items-center gap-1.5'
                    : 'flex min-w-0 items-center gap-1.5'
            }
        >
            {labels.length === 0 && (
                <span className="text-sm text-[var(--text-gray-color)]">
                    None
                </span>
            )}
            {maxDisplay === undefined ? (
                labels.map((label) => <LabelBadge key={label} label={label} />)
            ) : (
                <div className="min-w-0 flex-1">
                    <LabelList
                        labels={labels}
                        badgeClassName="text-[10px] px-1.5 py-0.2"
                        maxDisplay={maxDisplay}
                    />
                </div>
            )}
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
                        className={cn(
                            'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:hover:bg-transparent',
                            revealTrigger && REVEAL_ON_ROW_HOVER,
                        )}
                    >
                        <Icon name="Plus" size={12} />
                    </button>
                }
            />
        </div>
    );
};

export default EditableLabelList;
