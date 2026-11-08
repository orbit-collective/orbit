import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

interface SegmentedControlProps<T extends string | number> {
    /** Names the group for assistive technology. */
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    /** Stretch the segments over the whole row. */
    fullWidth?: boolean;
    className?: string;
}

/** A row of mutually exclusive choices, the active one raised. */
function SegmentedControl<T extends string | number>({
    label,
    value,
    options,
    onChange,
    fullWidth = false,
    className,
}: SegmentedControlProps<T>) {
    return (
        <div
            role="group"
            aria-label={label}
            className={cn(
                'flex flex-wrap gap-0.5 rounded-lg bg-[var(--bg-light-color)] p-0.5',
                fullWidth ? 'w-full' : 'w-fit max-w-full',
                className,
            )}
        >
            {options.map((option) => {
                const active = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'cursor-pointer rounded-md border-none px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                            FOCUS_RING,
                            fullWidth && 'flex-1',
                            active
                                ? 'bg-[var(--surface-color)] text-[var(--text-color)] shadow-sm'
                                : 'bg-transparent text-[var(--text-gray-color)] hover:text-[var(--text-color)]',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

export default SegmentedControl;
