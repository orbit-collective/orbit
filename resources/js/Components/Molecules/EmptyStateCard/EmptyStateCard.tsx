import Icon from '@/Components/Atoms/Icon/Icon';
import { useShortcuts } from '@/context/ShortcutContext';
import { DashboardEmptyStateProps } from '@/types/Components';
import { Link } from '@inertiajs/react';
import React from 'react';

function DashboardEmptyState({
    iconName,
    title,
    description,
    actionLabel,
    actionHref,
    actionShortcut,
}: DashboardEmptyStateProps) {
    const { triggerShortcut } = useShortcuts();

    const handleClick = (e: React.MouseEvent) => {
        if (actionShortcut) {
            e.preventDefault();
            triggerShortcut(actionShortcut);
        }
    };

    const showAction = actionLabel && (actionHref || actionShortcut);

    return (
        <Link
            href={actionHref}
            onClick={handleClick}
            className="hover:bg-[var(--accent-color)]/[0.02] group flex flex-col items-center justify-center bg-[var(--surface-color)] p-8 text-center transition-all duration-200"
        >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-color-strong)] bg-[var(--surface-color)] text-[var(--text-muted-color)] transition-colors group-hover:border-purple-500/30 group-hover:text-[var(--accent-color)]">
                <Icon name={iconName} size={22} />
            </div>

            <div className="max-w-xs">
                <h4 className="text-sm font-semibold text-[var(--text-color)] transition-colors group-hover:text-[var(--text-color)]">
                    {title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted-color)]">
                    {description}
                </p>
            </div>

            {showAction && (
                <span className="mt-3 text-xs font-medium text-[var(--accent-color)] opacity-0 transition-opacity group-hover:opacity-100">
                    {actionLabel}
                </span>
            )}
        </Link>
    );
}

export default DashboardEmptyState;
