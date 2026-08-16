import { FilterButtonProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import React from 'react';
import Icon from '../../Atoms/Icon/Icon';

const FilterButton: React.FC<FilterButtonProps> = ({
    icon,
    label,
    value,
    isActive,
    onClick,
}) => {
    return (
        <button
            className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-all duration-100 ease-in-out',
                isActive
                    ? 'border-solid border-purple-500/30 bg-[var(--bg-color)] text-[var(--accent-color)]'
                    : 'border-dashed border-[var(--bg-light-color)] bg-transparent text-[var(--text-gray-color)] hover:border-solid hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
            )}
            onClick={onClick}
        >
            {icon && (
                <Icon
                    name={icon}
                    size={14}
                    color={isActive ? 'var(--accent-color)' : '#999'}
                />
            )}
            <span className={'font-normal'}>{label}</span>
            {value && (
                <span
                    className={cn(
                        'font-medium',
                        isActive
                            ? 'text-[var(--accent-color)]'
                            : 'text-[var(--text-color)]',
                    )}
                >
                    {value}
                </span>
            )}
            {onClick && (
                <Icon
                    name="ChevronDown"
                    size={12}
                    color={isActive ? 'var(--accent-color)' : '#999'}
                />
            )}
        </button>
    );
};

export default FilterButton;
