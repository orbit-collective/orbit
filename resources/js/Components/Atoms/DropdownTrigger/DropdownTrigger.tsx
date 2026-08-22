import Icon from '@/Components/Atoms/Icon/Icon';
import { DropdownTriggerProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';

export const dropdownTriggerVariants = cva(
    'flex cursor-pointer items-center text-left text-sm font-medium text-[var(--text-color)] outline-none transition-all duration-200 ease-linear disabled:cursor-not-allowed disabled:opacity-60',
    {
        variants: {
            variant: {
                default:
                    'justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-2.5',
                pill: 'h-9 justify-start gap-2 rounded-full border px-3.5',
            },
            isOpen: {
                true: '',
                false: '',
            },
        },
        compoundVariants: [
            {
                variant: 'pill',
                isOpen: false,
                class: 'border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)]',
            },
            {
                variant: 'pill',
                isOpen: true,
                class: 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)] shadow-[0_0_0_3px_var(--accent-color-opacity)]',
            },
        ],
        defaultVariants: {
            variant: 'default',
            isOpen: false,
        },
    },
);

const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
    function DropdownTrigger(
        {
            label,
            icon,
            badge,
            isOpen = false,
            variant,
            onClick,
            disabled,
            className,
        },
        ref,
    ) {
        return (
            <button
                ref={ref}
                type="button"
                className={cn(
                    dropdownTriggerVariants({ variant, isOpen }),
                    className,
                )}
                onClick={onClick}
                disabled={disabled}
            >
                {icon && (
                    <Icon
                        name={icon}
                        size={13}
                        className={cn(
                            'shrink-0',
                            variant === 'pill' && isOpen
                                ? 'text-[var(--accent-color)]'
                                : 'text-[var(--text-gray-color)]',
                        )}
                    />
                )}
                <span className="flex flex-1 items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {label}
                </span>
                {badge !== undefined && badge > 0 && (
                    <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] px-1 text-[10px] font-semibold text-white">
                        {badge}
                    </span>
                )}
                <Icon
                    name="ChevronDown"
                    size={variant === 'pill' ? 12 : undefined}
                    className={cn(
                        'shrink-0 transition-transform duration-200',
                        variant === 'pill' && 'text-[var(--text-gray-color)]',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>
        );
    },
);

export default DropdownTrigger;
