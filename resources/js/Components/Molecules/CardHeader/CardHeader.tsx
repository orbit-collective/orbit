import React from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { CardHeaderProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

const iconBox =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-color-opacity) text-(--accent-color)';

/**
 * The icon + title row at the top of a card. With `onToggleCollapse` the whole
 * row is a button that folds the card, a chevron shows the state, and the
 * optional summary stays visible while it is folded.
 */
const CardHeader: React.FC<CardHeaderProps> = ({
    icon,
    title,
    description,
    collapsed = false,
    onToggleCollapse,
    collapsedSummary,
    controls,
}) => {
    const content = (
        <>
            {icon && (
                <span className={iconBox}>
                    <Icon name={icon} size={15} />
                </span>
            )}
            <span className="min-w-0 flex-1 text-left text-sm font-semibold text-(--text-color)">
                {title}
            </span>
            {collapsed && collapsedSummary && (
                <span
                    data-testid="collapsed-summary"
                    className="min-w-0 truncate text-xs text-(--text-gray-color)"
                >
                    {collapsedSummary}
                </span>
            )}
            {onToggleCollapse && (
                <Icon
                    name="ChevronDown"
                    size={16}
                    className={cn(
                        'shrink-0 text-(--text-muted-color) transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]',
                        collapsed && '-rotate-90',
                    )}
                />
            )}
        </>
    );

    const heading = !onToggleCollapse ? (
        <h3 className="m-0 flex items-center gap-3 font-normal">{content}</h3>
    ) : (
        <h3 className="m-0 font-normal">
            <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls={controls}
                onClick={onToggleCollapse}
                className={cn(
                    'flex w-full items-center gap-3 rounded-lg border-0 bg-transparent p-0',
                    FOCUS_RING,
                    'focus-visible:ring-offset-4',
                )}
            >
                {content}
            </button>
        </h3>
    );

    return (
        <div>
            {heading}
            {description && !collapsed && (
                <p
                    className={cn(
                        'mt-1 text-sm text-(--text-gray-color)',
                        icon && 'pl-11',
                    )}
                >
                    {description}
                </p>
            )}
        </div>
    );
};

export default CardHeader;
