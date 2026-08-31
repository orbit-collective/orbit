import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { NavItemProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { Link } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import React from 'react';
import Icon from '../../Atoms/Icon/Icon';

const classVariants = cva(
    'flex items-center py-1.5 px-2.5 rounded-md cursor-pointer transition-colors duration-100 ease-in-out mb-[2px] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
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
        },
        defaultVariants: {
            isActive: false,
            collapsed: false,
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
}) => {
    return (
        <Link
            className={classVariants({ isActive, collapsed })}
            onClick={onClick}
            href={link}
            preserveScroll={preserveScroll}
            title={collapsed ? label : undefined}
        >
            <div className={cn('flex items-center', !collapsed && 'gap-2.5')}>
                <Icon name={icon} size={16} className={iconClassName} />
                {!collapsed && (
                    <span className={'text-sm font-normal'}>{label}</span>
                )}
            </div>
            {!collapsed && badge !== undefined && (
                <Keybind
                    tooltipText={`Press ${badge}`}
                    keybind={badge.toString()}
                />
            )}
        </Link>
    );
};

export default NavItem;
