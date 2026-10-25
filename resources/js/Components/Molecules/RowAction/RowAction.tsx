import { icons } from 'lucide-react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';

interface RowActionProps {
    title: string;
    icon: keyof typeof icons;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
}

/** A small icon button for the end of a settings list row. */
export default function RowAction({
    title,
    icon,
    onClick,
    disabled = false,
    danger = false,
}: RowActionProps) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-gray-color)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-30',
                danger
                    ? 'hover:bg-[var(--error-color)]/10 hover:text-[var(--error-color)]'
                    : 'hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]',
                !disabled && 'cursor-pointer',
            )}
        >
            <Icon name={icon} size={14} />
        </button>
    );
}
