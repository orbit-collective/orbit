import { cn } from '@/utils/cn';

interface ToggleChipProps {
    label: string;
    pressed: boolean;
    onClick: () => void;
    disabled?: boolean;
}

/** A small pill that is either on or off: the quiet alternative to a checkbox in a dense row. */
export default function ToggleChip({
    label,
    pressed,
    onClick,
    disabled = false,
}: ToggleChipProps) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'inline-flex items-center rounded-full border border-solid px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-50',
                pressed
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)] text-[var(--text-color)]'
                    : 'border-[var(--border-color)] bg-transparent text-[var(--text-gray-color)] hover:border-[var(--border-color-strong)] hover:text-[var(--text-color)]',
                !disabled && 'cursor-pointer',
            )}
        >
            {label}
        </button>
    );
}
