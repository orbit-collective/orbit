import Badge from '@/Components/Atoms/Badge/Badge';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { NavItemProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { Link } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import React from 'react';
import Icon from '../../Atoms/Icon/Icon';

const classVariants = cva(
    'flex items-center py-1.5 px-2.5 rounded-md transition-colors duration-100 ease-in-out mb-[2px]',
    {
        variants: {
            isActive: {
                true: 'bg-[var(--bg-light-color)] text-[var(--text-color)]',
                false: 'text-[var(--text-gray-color)]',
            },
            collapsed: {
                true: 'justify-center',
                false: 'justify-between',
            },
            disabled: {
                true: 'cursor-not-allowed opacity-50',
                false: 'cursor-pointer hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
            },
        },
        defaultVariants: {
            isActive: false,
            collapsed: false,
            disabled: false,
        },
    },
);

const NavItem: React.FC<NavItemProps> = ({
    icon,
    label,
    isActive,
    badge,
    onClick,
    iconClassName,
    link,
    preserveScroll = false,
    collapsed = false,
    disabled = false,
}) => {
    const className = classVariants({ isActive, collapsed, disabled });
    const title = collapsed ? label : undefined;

    const content = (
        <>
            <div className={cn('flex items-center', !collapsed && 'gap-2.5')}>
                <Icon name={icon} size={16} className={iconClassName} />
                {!collapsed && (
                    <span className={'text-sm font-normal'}>{label}</span>
                )}
            </div>
            {!collapsed && disabled && (
                <Badge color="closed" className="shrink-0 tracking-wide">
                    Soon
                </Badge>
            )}
            {!collapsed && !disabled && badge !== undefined && (
                <Keybind
                    tooltipText={`Press ${badge}`}
                    keybind={badge.toString()}
                />
            )}
        </>
    );

    if (disabled) {
        return (
            <div className={className} title={title} aria-disabled="true">
                {content}
            </div>
        );
    }

    return (
        <Link
            className={className}
            onClick={onClick}
            href={link}
            preserveScroll={preserveScroll}
            title={title}
        >
            {content}
        </Link>
    );
};

export default NavItem;
