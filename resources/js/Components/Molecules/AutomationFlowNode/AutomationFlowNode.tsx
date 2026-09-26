import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { icons } from 'lucide-react';
import React, { ReactNode } from 'react';

export interface AutomationFlowNodeProps {
    icon: keyof typeof icons;
    color: string;
    eyebrow: string;
    title: string;
    subtitle?: string;
    selected?: boolean;
    /** Shown when the node fails to describe itself completely (e.g. no trigger picked yet). */
    incomplete?: boolean;
    onClick?: () => void;
    /** Drag handle listeners/attributes from a dnd-kit useDraggable() call - omitted entirely when the node can't be reordered. */
    dragHandleProps?: { listeners?: object; attributes?: object };
    onDelete?: () => void;
    isDragging?: boolean;
    isDropTarget?: boolean;
    style?: React.CSSProperties;
    setNodeRef?: (node: HTMLElement | null) => void;
    trailing?: ReactNode;
}

/**
 * One step of a rule's visual flow (trigger, conditions, or an action) -
 * see WorkspaceSettingsAutomationTab, the only place these are composed
 * into a connected chain. Purely presentational: selection, dragging, and
 * deletion are all driven by the parent.
 */
export default function AutomationFlowNode({
    icon,
    color,
    eyebrow,
    title,
    subtitle,
    selected = false,
    incomplete = false,
    onClick,
    dragHandleProps,
    onDelete,
    isDragging = false,
    isDropTarget = false,
    style,
    setNodeRef,
    trailing,
}: AutomationFlowNodeProps) {
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative flex w-full items-center gap-3 rounded-2xl border bg-[var(--surface-color)] px-4 py-3 text-left transition-colors',
                selected
                    ? 'border-[var(--accent-color)] shadow-[0_0_0_1px_var(--accent-color)]'
                    : 'border-[var(--border-color)] hover:border-[var(--border-color-strong)]',
                isDragging && 'z-10 opacity-90 shadow-2xl',
                isDropTarget && !isDragging && 'border-[var(--accent-color)]',
            )}
        >
            {dragHandleProps && (
                <button
                    type="button"
                    aria-label={`Reorder ${title}`}
                    className="shrink-0 cursor-grab text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)] active:cursor-grabbing"
                    {...dragHandleProps.listeners}
                    {...dragHandleProps.attributes}
                >
                    <Icon name="GripVertical" size={14} />
                </button>
            )}

            <button
                type="button"
                onClick={onClick}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
                <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
                    }}
                >
                    <Icon name={icon} size={17} color={color} />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted-color)]">
                        {eyebrow}
                    </span>
                    <span className="block truncate text-sm font-medium text-[var(--text-color)]">
                        {title}
                    </span>
                    {subtitle && (
                        <span className="block truncate text-xs text-[var(--text-gray-color)]">
                            {subtitle}
                        </span>
                    )}
                </span>

                {incomplete && (
                    <Icon
                        name="TriangleAlert"
                        size={14}
                        className="shrink-0 text-[var(--warning-color)]"
                    />
                )}
            </button>

            {trailing}

            {onDelete && (
                <button
                    type="button"
                    aria-label={`Remove ${title}`}
                    onClick={onDelete}
                    className="hover:bg-[var(--error-color)]/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-gray-color)] opacity-0 transition-opacity hover:text-[var(--error-color)] group-hover:opacity-100"
                >
                    <Icon name="X" size={13} />
                </button>
            )}
        </div>
    );
}
