import { Link } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { NavItemProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import Icon from '../../Atoms/Icon/Icon';

const classVariants = cva(
    'flex items-center py-1.5 px-2.5 rounded-md transition-colors duration-100 ease-in-out mb-[2px]',
    {
        variants: {
            isActive: {
                true: 'bg-(--bg-light-color) text-(--text-color)',
                false: 'text-(--text-gray-color)',
            },
            collapsed: {
                true: 'justify-center',
                false: 'justify-between',
            },
            disabled: {
                true: 'cursor-not-allowed opacity-50',
                false: 'cursor-pointer hover:bg-(--bg-light-color) hover:text-(--text-color)',
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
    title: titleOverride,
    preserveScroll = false,
    collapsed = false,
    disabled = false,
    tourId,
}) => {
    const { t } = useLaravelReactI18n();
    const className = classVariants({ isActive, collapsed, disabled });
    const title = titleOverride ?? (collapsed ? label : undefined);

    const content = (
        <>
            <div className={cn('flex items-center', !collapsed && 'gap-2.5')}>
                {icon ? (
                    <Icon name={icon} size={16} className={iconClassName} />
                ) : (
                    <div className={`h-2 w-2 rounded-full ${iconClassName}`} />
                )}
                {!collapsed && (
                    <span className={'text-sm font-normal'}>{label}</span>
                )}
            </div>
            {!collapsed && disabled && (
                <Badge color="done" className="shrink-0 tracking-wide">
                    {t('nav_item.soon')}
                </Badge>
            )}
            {!collapsed && !disabled && badge !== undefined && (
                <Keybind
                    tooltipText={t('nav_item.press', { key: String(badge) })}
                    keybind={badge.toString()}
                />
            )}
        </>
    );

    if (disabled) {
        return (
            <div
                className={className}
                title={title}
                aria-disabled="true"
                data-tour={tourId}
            >
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
            data-tour={tourId}
            aria-current={isActive ? 'page' : undefined}
        >
            {content}
        </Link>
    );
};

export default NavItem;
