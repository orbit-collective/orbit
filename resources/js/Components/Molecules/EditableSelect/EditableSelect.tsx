import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { EditableSelectProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import React, { useMemo } from 'react';

/**
 * Click-to-edit single select: the current value is the trigger, picking
 * another option saves it straight away. Built on `Dropdown`.
 */
const EditableSelect: React.FC<EditableSelectProps> = ({
    value,
    options,
    onSave,
    renderValue,
    header,
    disabled = false,
    className,
    bare = false,
}) => {
    const selected = options.find((option) => option.value === value);
    const items = useMemo(
        () =>
            options.map((option) => ({
                value: option.value,
                label: option.label,
                searchLabel: option.searchLabel ?? option.value,
            })),
        [options],
    );

    return (
        <Dropdown
            variant="select"
            title={header}
            width={256}
            options={items}
            selectedValues={[value]}
            onSelect={(next) => {
                if (next !== value) onSave(next);
            }}
            disabled={disabled}
            triggerClassName={cn('w-fit', className)}
            trigger={
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-full text-left transition-colors disabled:cursor-not-allowed',
                        !bare &&
                            'px-2 py-1 hover:bg-[var(--bg-light-color)] disabled:hover:bg-transparent',
                    )}
                >
                    {renderValue
                        ? renderValue(value)
                        : (selected?.label ?? value)}
                </button>
            }
        />
    );
};

export default EditableSelect;
