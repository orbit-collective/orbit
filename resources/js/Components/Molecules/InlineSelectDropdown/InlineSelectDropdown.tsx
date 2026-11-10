import { icons } from 'lucide-react';
import { useMemo } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { InlineSelectDropdownProps } from '@/types/Components';
import { DropdownOptionItem } from '@/types/Dropdown';
import { cn } from '@/utils/cn';

/**
 * A single-select dropdown driven by plain value/onChange props, for use
 * anywhere a native <select> would otherwise be reached for (e.g. the
 * integration field-mapping table). A thin trigger on top of `Dropdown`.
 */
export default function InlineSelectDropdown({
    label,
    placeholder,
    options,
    value,
    onChange,
    disabled = false,
    subtle = false,
}: InlineSelectDropdownProps) {
    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    const items = useMemo(
        (): DropdownOptionItem[] =>
            options.map((option) => ({
                value: option.value,
                label: option.label,
                icon: option.icon as keyof typeof icons | undefined,
                iconColor: option.color,
            })),
        [options],
    );

    return (
        <Dropdown
            variant="select"
            title={label}
            ariaLabel={label}
            searchPlaceholder={`Search ${label.toLowerCase()}…`}
            options={items}
            selectedValues={value ? [value] : []}
            // Picking the current value again clears it.
            onSelect={(next) => onChange(value === next ? null : next)}
            onClear={() => onChange(null)}
            disabled={disabled}
            trigger={
                <button
                    type="button"
                    disabled={disabled}
                    aria-label={label}
                    className={cn(
                        'flex min-w-36 cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-all duration-100 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-color) disabled:cursor-not-allowed disabled:opacity-50',
                        selectedOption && subtle
                            ? 'border-solid border-(--border-color) bg-(--bg-color) text-(--text-color)'
                            : selectedOption
                              ? 'border-solid border-(--accent-color-opacity) bg-(--bg-color) text-(--accent-color)'
                              : 'border-dashed border-(--bg-light-color) bg-transparent text-(--text-gray-color) hover:border-solid hover:bg-(--bg-light-color) hover:text-(--text-color)',
                    )}
                >
                    <span className="flex min-w-0 items-center gap-1.5">
                        {selectedOption?.icon && (
                            <Icon
                                name={selectedOption.icon as keyof typeof icons}
                                size={13}
                                color={selectedOption.color}
                                className="shrink-0"
                            />
                        )}
                        <span
                            className={cn(
                                'truncate font-medium',
                                selectedOption && subtle
                                    ? 'text-(--text-color)'
                                    : selectedOption
                                      ? 'text-(--accent-color)'
                                      : 'text-(--text-gray-color)',
                            )}
                        >
                            {selectedOption?.label ?? placeholder}
                        </span>
                    </span>
                    <Icon
                        name="ChevronDown"
                        size={12}
                        color={
                            selectedOption && !subtle
                                ? 'var(--accent-color)'
                                : 'var(--text-gray-color)'
                        }
                    />
                </button>
            }
        />
    );
}
