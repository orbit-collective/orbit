import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { NavItemProps } from '@/types/Components';
import { Link } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import React from 'react';
import Icon from '../../Atoms/Icon/Icon';

const classVariants = cva(
    'flex items-center justify-between py-2 px-3 rounded-full cursor-pointer transition-all duration-100 ease-in-out mb-[2px] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
    {
        variants: {
            isActive: {
                true: 'bg-[var(--accent-color-opacity)] text-[var(--text-color)]',
                false: 'text-[var(--text-gray-color)]',
            },
        },
        defaultVariants: {
            isActive: false,
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
}) => {
    return (
        <Link
            className={classVariants({ isActive })}
            onClick={onClick}
            href={link}
            preserveScroll={preserveScroll}
        >
            <div className={'flex items-center gap-3'}>
                <Icon name={icon} size={18} className={iconClassName} />
                <span className={'text-sm font-normal'}>{label}</span>
            </div>
            {badge !== undefined && (
                <Keybind
                    tooltipText={`Press ${badge}`}
                    keybind={badge.toString()}
                />
            )}
        </Link>
    );
};

export default NavItem;
