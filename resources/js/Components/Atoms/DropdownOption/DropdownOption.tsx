import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { icons } from 'lucide-react';
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface DropdownOptionProps extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'children'
> {
    label: ReactNode;
    icon?: keyof typeof icons;
    iconColor?: string;
    description?: ReactNode;
    trailing?: ReactNode;
    isSelected?: boolean;
    /** `check` shows the filled-square indicator; `none` is a plain action row. */
    indicator?: 'check' | 'none';
    tone?: 'default' | 'danger';
}

/** One selectable row inside a `DropdownPanel`. */
const DropdownOption = forwardRef<HTMLButtonElement, DropdownOptionProps>(
    function DropdownOption(
        {
            label,
            icon,
            iconColor,
            description,
            trailing,
            isSelected = false,
            indicator = 'check',
            tone = 'default',
            className,
            ...props
        },
        ref,
    ) {
        return (
            <button
                ref={ref}
                type="button"
                className={cn(
                    'group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-all duration-150 focus:outline-none focus-visible:bg-[var(--bg-light-color)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
                    tone === 'danger'
                        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300 focus-visible:bg-red-500/10'
                        : isSelected
                          ? 'bg-[var(--accent-color)]/10 text-[var(--text-color)]'
                          : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] focus-visible:text-[var(--text-color)]',
                    className,
                )}
                {...props}
            >
                {indicator === 'check' && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] transition-all duration-150',
                            isSelected
                                ? 'bg-[var(--accent-color)]'
                                : 'bg-[var(--bg-light-color)]',
                        )}
                    >
                        {isSelected && (
                            <Icon
                                name="Check"
                                size={10}
                                className="text-white"
                            />
                        )}
                    </span>
                )}
                {icon && (
                    <Icon
                        name={icon}
                        size={13}
                        color={iconColor}
                        className="shrink-0"
                    />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                        {label}
                    </span>
                    {description && (
                        <span className="truncate text-[10px] font-normal text-[var(--text-muted-color)]">
                            {description}
                        </span>
                    )}
                </span>
                {trailing && (
                    <span className="flex shrink-0 items-center text-[var(--text-muted-color)]">
                        {trailing}
                    </span>
                )}
            </button>
        );
    },
);

export default DropdownOption;
