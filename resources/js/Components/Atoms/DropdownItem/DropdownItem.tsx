import { DropdownItemProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';

export const dropdownItemVariants = cva(
    'group w-full text-left bg-transparent border-none outline-none px-3 py-2 text-sm text-[var(--text-gray-color)] rounded-md cursor-pointer transition-all duration-150 font-inherit flex items-center gap-2 hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-gray-color)]',
    {
        variants: {
            isActive: {
                true: 'bg-[var(--accent-color)]/10 text-[var(--text-color)]',
                false: '',
            },
            variant: {
                default: '',
                danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
                success:
                    'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
                warning:
                    'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
                info: 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10',
            },
        },
        defaultVariants: {
            isActive: false,
            variant: 'default',
        },
    },
);

export default function DropdownItem({
    label,
    trailing,
    onClick,
    isActive,
    variant,
    className,
    ...props
}: DropdownItemProps & {
    variant?: 'default' | 'danger' | 'success' | 'warning' | 'info';
}) {
    return (
        <button
            type="button"
            className={cn(
                dropdownItemVariants({ isActive, variant, className }),
            )}
            onClick={onClick}
            {...props}
        >
            <span className="flex min-w-0 flex-1 items-center gap-2">
                {label}
            </span>
            {trailing && (
                <span className="flex shrink-0 items-center text-[var(--text-muted-color)]">
                    {trailing}
                </span>
            )}
        </button>
    );
}
