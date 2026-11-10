import React from 'react';
import { FilterButtonProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import Icon from '../../Atoms/Icon/Icon';

const FilterButton: React.FC<FilterButtonProps> = ({
    icon,
    label,
    value,
    isActive,
    onClick,
    hasMenu,
}) => {
    return (
        <button
            className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-all duration-100 ease-in-out',
                isActive
                    ? 'border-solid border-(--accent-color-opacity) bg-(--bg-color) text-(--accent-color)'
                    : 'border-dashed border-(--bg-light-color) bg-transparent text-(--text-gray-color) hover:border-solid hover:bg-(--bg-light-color) hover:text-(--text-color)',
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
                            ? 'text-(--accent-color)'
                            : 'text-(--text-color)',
                    )}
                >
                    {value}
                </span>
            )}
            {(hasMenu ?? !!onClick) && (
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
