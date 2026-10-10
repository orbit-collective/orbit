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
                        'flex min-w-[9rem] cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-all duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-50',
                        selectedOption && subtle
                            ? 'border-solid border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]'
                            : selectedOption
                              ? 'border-solid border-[var(--accent-color-opacity)] bg-[var(--bg-color)] text-[var(--accent-color)]'
                              : 'border-dashed border-[var(--bg-light-color)] bg-transparent text-[var(--text-gray-color)] hover:border-solid hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
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
                                    ? 'text-[var(--text-color)]'
                                    : selectedOption
                                      ? 'text-[var(--accent-color)]'
                                      : 'text-[var(--text-gray-color)]',
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
